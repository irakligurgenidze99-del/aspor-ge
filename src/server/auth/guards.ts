import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from './session';

/**
 * Current partner allowed to see wholesale prices, re-validated against the DB on
 * every request: user ACTIVE + role PARTNER + partner ACTIVE. Returns null otherwise.
 */
export const getActivePartner = cache(async () => {
  const s = await getSession('partner');
  if (!s) return null;
  const u = s.user;
  if (u.role !== 'PARTNER' || u.status !== 'ACTIVE' || !u.partner || u.partner.status !== 'ACTIVE') return null;
  return { userId: u.id, partnerId: u.partner.id, email: u.email, companyName: u.partner.companyName };
});

/** Signed-in partner (any status) — for showing profile/status messages, NOT prices. */
export const getPartnerAccount = cache(async () => {
  const s = await getSession('partner');
  return s ? s.user : null;
});

export class AuthError extends Error {
  constructor(public code: 'unauthenticated' | 'forbidden' | 'mfa_required') {
    super(code);
  }
}

/** Every admin page and server action must call this first. */
export const requireAdmin = cache(async (opts: { allowPendingMfa?: boolean } = {}) => {
  const s = await getSession('admin');
  if (!s || s.user.role !== 'SUPER_ADMIN' || s.user.status !== 'ACTIVE') redirect('/admin/login');
  const mfaRequired = process.env.ADMIN_MFA_REQUIRED !== 'false';
  if (mfaRequired && !opts.allowPendingMfa) {
    if (!s.user.totpEnabledAt) redirect('/admin/mfa/setup');
    if (!s.mfaPassed) redirect('/admin/mfa');
  }
  return s.user;
});

/** For server actions: throws instead of redirecting HTML. */
export async function assertAdmin() {
  const s = await getSession('admin');
  if (!s || s.user.role !== 'SUPER_ADMIN' || s.user.status !== 'ACTIVE') throw new AuthError('unauthenticated');
  if (process.env.ADMIN_MFA_REQUIRED !== 'false' && (!s.user.totpEnabledAt || !s.mfaPassed)) throw new AuthError('mfa_required');
  return s.user;
}
