import 'server-only';
import fs from 'node:fs';

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };
export type SendResult = { ok: true; providerId?: string } | { ok: false; error: string; retryable: boolean };

export interface EmailProvider {
  name: string;
  send(msg: OutgoingEmail): Promise<SendResult>;
}

/** Development provider: prints to server log. Messages are also kept in EmailLog (admin → ელფოსტა). */
const consoleProvider: EmailProvider = {
  name: 'console',
  async send(msg) {
    if (process.env.NODE_ENV === 'production') console.warn(`[email:console] NOT DELIVERED (EMAIL_PROVIDER=console) to=${msg.to} subject="${msg.subject}"`);
    else if (process.env.NODE_ENV !== 'test') console.info(`[email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`);
    // Local/E2E mail capture (like a dev mailbox). Never enabled on a Vercel production deployment.
    const capture = process.env.EMAIL_CAPTURE_FILE;
    if (capture && process.env.VERCEL_ENV !== 'production') fs.appendFileSync(capture, JSON.stringify({ ...msg, at: Date.now() }) + '\n');
    return { ok: true, providerId: 'console' };
  },
};

/** Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email). */
const resendProvider: EmailProvider = {
  name: 'resend',
  async send(msg) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: 'RESEND_API_KEY not configured', retryable: false };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const j = (await res.json().catch(() => ({}))) as { id?: string };
        return { ok: true, providerId: j.id };
      }
      const body = (await res.text()).slice(0, 300);
      return { ok: false, error: `HTTP ${res.status}: ${body}`, retryable: res.status === 429 || res.status >= 500 };
    } catch (e) {
      return { ok: false, error: (e as Error).message.slice(0, 300), retryable: true };
    }
  },
};

export function getEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === 'resend' ? resendProvider : consoleProvider;
}
