import 'server-only';
import { db } from '@/lib/db';
import { getEmailProvider } from './provider';
import type { Rendered } from './templates';

const MAX_ATTEMPTS = 5;
const REDACTED = '[redacted after delivery — contained a one-time link]';

/**
 * Persist to the outbox, then attempt delivery immediately. Never throws to callers:
 * user-facing flows must not fail (or reveal anything) because email is down.
 * `sensitive` bodies (one-time links) are redacted once delivered.
 */
export async function sendEmail(to: string, template: string, r: Rendered, opts: { sensitive?: boolean } = {}) {
  const log = await db.emailLog.create({ data: { to, template: opts.sensitive ? `secure:${template}` : template, subject: r.subject, html: r.html, text: r.text } });
  await attempt(log.id, opts.sensitive ?? false);
  return log.id;
}

async function attempt(id: string, sensitive: boolean) {
  const log = await db.emailLog.findUnique({ where: { id } });
  if (!log || log.status === 'SENT') return;
  const res = await getEmailProvider().send({ to: log.to, subject: log.subject, html: log.html, text: log.text });
  const attempts = log.attempts + 1;
  if (res.ok) {
    await db.emailLog.update({
      where: { id },
      data: { status: 'SENT', attempts, sentAt: new Date(), providerId: res.providerId, lastError: null, ...(sensitive ? { html: REDACTED, text: REDACTED } : {}) },
    });
  } else {
    const giveUp = !res.retryable || attempts >= MAX_ATTEMPTS;
    console.error(`[email] delivery failed id=${id} attempt=${attempts}: ${res.error}`);
    await db.emailLog.update({
      where: { id },
      data: { status: 'FAILED', attempts, lastError: res.error, nextAttemptAt: giveUp ? new Date(8.64e15) : new Date(Date.now() + 2 ** attempts * 60_000), ...(giveUp && sensitive ? { html: REDACTED, text: REDACTED } : {}) },
    });
  }
}

/** Retry failed deliveries with exponential backoff. Called by /api/cron/emails and admin "retry". */
export async function processOutbox(limit = 20) {
  const due = await db.emailLog.findMany({
    where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: MAX_ATTEMPTS }, nextAttemptAt: { lte: new Date() } },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });
  for (const d of due) await attempt(d.id, d.template.startsWith('secure:'));
  return due.length;
}

export async function retryEmailNow(id: string) {
  await db.emailLog.update({ where: { id }, data: { nextAttemptAt: new Date(), attempts: 0 } });
  const log = await db.emailLog.findUnique({ where: { id } });
  if (log) await attempt(id, log.template.startsWith('secure:'));
}
