import 'server-only';
import { db } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto';
import type { TokenPurpose } from '@/generated/prisma/client';

export const TOKEN_TTL: Record<TokenPurpose, number> = {
  PASSWORD_SETUP: 72 * 3600 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Issues a one-time token; previous unused tokens of the same purpose are invalidated. Only the hash is stored. */
export async function issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const token = randomToken(32);
  await db.$transaction([
    db.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    db.authToken.create({ data: { userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL[purpose]) } }),
  ]);
  return token;
}

export async function peekToken(token: string, purpose: TokenPurpose) {
  if (!token || token.length > 100) return null;
  const t = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.purpose !== purpose || t.usedAt || t.expiresAt < new Date()) return null;
  return t;
}

/** Atomically consumes the token (one-time). Returns userId or null. */
export async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const t = await peekToken(token, purpose);
  if (!t) return null;
  const res = await db.authToken.updateMany({ where: { id: t.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  return res.count === 1 ? t.userId : null;
}
