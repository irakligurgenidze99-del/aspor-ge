import { beforeEach, describe, expect, it } from 'vitest';
import './helpers';
import { resetDb } from './helpers';
import { db } from '@/lib/db';
import { sendEmail, processOutbox } from '@/server/email';

beforeEach(resetDb);

describe('email outbox', () => {
  it('failed delivery is logged with backoff and retried by the outbox processor', async () => {
    process.env.EMAIL_PROVIDER = 'resend';
    delete process.env.RESEND_API_KEY; // misconfigured provider → non-retryable failure is recorded, caller does not throw
    const id = await sendEmail('x@example.test', 't', { subject: 's', html: 'h', text: 't' });
    let log = await db.emailLog.findUniqueOrThrow({ where: { id } });
    expect(log.status).toBe('FAILED');
    expect(log.lastError).toMatch(/RESEND_API_KEY/);
    // simulate a transient failure that is now resolved
    process.env.EMAIL_PROVIDER = 'console';
    await db.emailLog.update({ where: { id }, data: { nextAttemptAt: new Date() } });
    expect(await processOutbox()).toBe(1);
    log = await db.emailLog.findUniqueOrThrow({ where: { id } });
    expect(log.status).toBe('SENT');
    expect(log.attempts).toBe(2);
  });
});
