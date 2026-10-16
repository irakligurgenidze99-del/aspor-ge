import 'server-only';
import { db } from '@/lib/db';

export type RateRule = { max: number; windowSec: number };

export const RATE_RULES = {
  login: { max: 10, windowSec: 15 * 60 },
  loginEmail: { max: 6, windowSec: 15 * 60 },
  reset: { max: 5, windowSec: 60 * 60 },
  application: { max: 5, windowSec: 60 * 60 },
  contact: { max: 8, windowSec: 60 * 60 },
  translate: { max: 60, windowSec: 60 * 60 },
  mfa: { max: 10, windowSec: 15 * 60 },
} satisfies Record<string, RateRule>;

/**
 * Sliding-window limiter backed by Postgres so it works across serverless instances.
 * Returns true when the action is allowed (and records the hit).
 */
export async function rateLimit(key: string, rule: RateRule): Promise<boolean> {
  if (process.env.RATE_LIMIT_DISABLED === '1' && process.env.NODE_ENV !== 'production') return true;
  const since = new Date(Date.now() - rule.windowSec * 1000);
  const count = await db.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= rule.max) return false;
  await db.rateLimitHit.create({ data: { key } });
  // Opportunistic cleanup (~1% of calls).
  if (Math.random() < 0.01) {
    await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
  }
  return true;
}
