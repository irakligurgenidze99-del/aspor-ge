import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto';
import { clientIpHash, userAgent } from '../request';

export type Realm = 'partner' | 'admin';

const CFG: Record<Realm, { cookie: string; path: string; ttlMs: number }> = {
  partner: { cookie: 'aspor_sid', path: '/', ttlMs: 30 * 24 * 3600 * 1000 },
  admin: { cookie: 'aspor_admin_sid', path: '/admin', ttlMs: 12 * 3600 * 1000 },
};

export async function createSession(userId: string, realm: Realm, mfaPassed = false) {
  const token = randomToken(32);
  const cfg = CFG[realm];
  const expiresAt = new Date(Date.now() + cfg.ttlMs);
  await db.session.create({
    data: { tokenHash: sha256(token), userId, mfaPassed, expiresAt, ip: await clientIpHash(), userAgent: await userAgent() },
  });
  const jar = await cookies();
  jar.set(cfg.cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: cfg.path,
    expires: expiresAt,
    priority: 'high',
  });
}

async function readToken(realm: Realm): Promise<string | undefined> {
  return (await cookies()).get(CFG[realm].cookie)?.value;
}

/** Raw session + user; NO authorization decisions here. */
export const getSession = cache(async (realm: Realm) => {
  const token = await readToken(realm);
  if (!token || token.length > 100) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { partner: true } } },
  });
  if (!s) return null;
  if (s.expiresAt < new Date()) {
    await db.session.delete({ where: { id: s.id } }).catch(() => {});
    return null;
  }
  // Expected realm/role pairing.
  if (realm === 'admin' && s.user.role !== 'SUPER_ADMIN') return null;
  if (realm === 'partner' && s.user.role !== 'PARTNER') return null;
  if (Date.now() - s.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  return s;
});

export async function markMfaPassed(realm: Realm) {
  const token = await readToken(realm);
  if (!token) return;
  await db.session.update({ where: { tokenHash: sha256(token) }, data: { mfaPassed: true } });
}

export async function destroySession(realm: Realm) {
  const token = await readToken(realm);
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  (await cookies()).set(CFG[realm].cookie, '', { path: CFG[realm].path, maxAge: 0 });
}

export async function destroyAllSessionsForUser(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}
