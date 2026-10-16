import 'server-only';
import { db } from '@/lib/db';
import { hmac } from '@/lib/crypto';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { ApplicationInput } from '@/lib/validation';
import { sendEmail } from '../email';
import * as T from '../email/templates';
import { issueToken, consumeToken, peekToken, TOKEN_TTL } from './tokens';
import { destroyAllSessionsForUser } from '../auth/session';
import { audit } from '../audit';

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const CONSENT_VERSION = '2026-10-v1';

export type SubmitResult = { ok: true } | { ok: false; error: 'rate_limited' | 'invalid' };

/**
 * Public application. Duplicate detection: an open (PENDING) application or an existing
 * partner with the same email or company code does not create a new record, but the
 * public response is identical, so the form cannot be used to enumerate customers.
 */
export async function submitApplication(input: ApplicationInput, ctx: { ipHash: string; locale: string }) {
  const [openApp, existingUser, existingPartner] = await Promise.all([
    db.partnershipApplication.findFirst({ where: { status: 'PENDING', OR: [{ email: input.email }, { companyCode: input.companyCode }] } }),
    db.user.findUnique({ where: { email: input.email } }),
    db.b2BPartner.findUnique({ where: { companyCode: input.companyCode } }),
  ]);
  if (openApp || existingUser || existingPartner) {
    await audit(null, 'application.duplicate_ignored', 'PartnershipApplication', openApp?.id, { reason: openApp ? 'pending' : existingUser ? 'email_exists' : 'company_exists' });
    return { duplicate: true as const };
  }
  const app = await db.partnershipApplication.create({
    data: {
      companyName: input.companyName, companyCode: input.companyCode, contactName: input.contactName, phone: input.phone, email: input.email,
      message: input.message || null, consentAt: new Date(), consentVersion: CONSENT_VERSION, ipHash: ctx.ipHash, locale: ctx.locale,
    },
  });
  await sendEmail(app.email, 'application_received', T.applicationReceived({ contactName: app.contactName, companyName: app.companyName }));
  const adminTo = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminTo) {
    await sendEmail(adminTo, 'application_admin_notify', T.applicationAdminNotify({ ...app, adminUrl: `${appUrl()}/admin/applications/${app.id}` }));
  }
  return { duplicate: false as const, id: app.id };
}

export class FlowError extends Error {}

export async function approveApplication(appId: string, adminId: string) {
  const result = await db.$transaction(async (tx) => {
    const app = await tx.partnershipApplication.findUnique({ where: { id: appId } });
    if (!app) throw new FlowError('not_found');
    if (app.status !== 'PENDING') throw new FlowError('not_pending');
    if (await tx.user.findUnique({ where: { email: app.email } })) throw new FlowError('email_exists');
    if (await tx.b2BPartner.findUnique({ where: { companyCode: app.companyCode } })) throw new FlowError('company_exists');
    const user = await tx.user.create({ data: { email: app.email, role: 'PARTNER', status: 'PENDING_SETUP', name: app.contactName } });
    await tx.b2BPartner.create({
      data: { userId: user.id, companyName: app.companyName, companyCode: app.companyCode, contactName: app.contactName, phone: app.phone, applicationId: app.id },
    });
    await tx.partnershipApplication.update({ where: { id: app.id }, data: { status: 'APPROVED', reviewedAt: new Date() } });
    return { app, user };
  });
  const token = await issueToken(result.user.id, 'PASSWORD_SETUP');
  const setupUrl = `${appUrl()}/${result.app.locale === 'en' ? 'en' : 'ka'}/account/setup?token=${encodeURIComponent(token)}`;
  await sendEmail(result.user.email, 'application_approved', T.applicationApproved({ contactName: result.app.contactName, setupUrl, expiresHours: TOKEN_TTL.PASSWORD_SETUP / 3600000 }), { sensitive: true });
  await audit(adminId, 'application.approve', 'PartnershipApplication', appId, { userId: result.user.id });
  return result.user.id;
}

export async function rejectApplication(appId: string, adminId: string, note?: string) {
  const app = await db.partnershipApplication.findUnique({ where: { id: appId } });
  if (!app) throw new FlowError('not_found');
  if (app.status !== 'PENDING') throw new FlowError('not_pending');
  await db.partnershipApplication.update({ where: { id: appId }, data: { status: 'REJECTED', reviewedAt: new Date(), reviewNote: note?.slice(0, 1000) || null } });
  await sendEmail(app.email, 'application_rejected', T.applicationRejected({ contactName: app.contactName }));
  await audit(adminId, 'application.reject', 'PartnershipApplication', appId);
}

export async function resendSetupLink(partnerId: string, adminId: string) {
  const p = await db.b2BPartner.findUnique({ where: { id: partnerId }, include: { user: true, application: true } });
  if (!p) throw new FlowError('not_found');
  if (p.user.status !== 'PENDING_SETUP') throw new FlowError('already_active');
  const token = await issueToken(p.userId, 'PASSWORD_SETUP');
  const setupUrl = `${appUrl()}/${p.application?.locale === 'en' ? 'en' : 'ka'}/account/setup?token=${encodeURIComponent(token)}`;
  await sendEmail(p.user.email, 'application_approved', T.applicationApproved({ contactName: p.contactName, setupUrl, expiresHours: TOKEN_TTL.PASSWORD_SETUP / 3600000 }), { sensitive: true });
  await audit(adminId, 'partner.resend_setup', 'B2BPartner', partnerId);
}

/** Suspension takes effect immediately: status is re-read on every price request and all sessions are revoked. */
export async function setPartnerSuspended(partnerId: string, suspended: boolean, adminId: string, reason?: string) {
  const p = await db.b2BPartner.update({
    where: { id: partnerId },
    data: suspended ? { status: 'SUSPENDED', suspendedAt: new Date(), suspendReason: reason?.slice(0, 500) || null } : { status: 'ACTIVE', suspendedAt: null, suspendReason: null },
  });
  await db.user.update({ where: { id: p.userId }, data: { status: suspended ? 'SUSPENDED' : (await db.user.findUnique({ where: { id: p.userId } }))?.passwordHash ? 'ACTIVE' : 'PENDING_SETUP' } });
  if (suspended) await destroyAllSessionsForUser(p.userId);
  await audit(adminId, suspended ? 'partner.suspend' : 'partner.reactivate', 'B2BPartner', partnerId, { reason: reason ?? null });
}

export async function completePasswordSetup(token: string, password: string, purpose: 'PASSWORD_SETUP' | 'PASSWORD_RESET', role: 'PARTNER' | 'SUPER_ADMIN' = 'PARTNER') {
  // Bind token to realm BEFORE consuming it: an admin token can't be used on the partner form or vice versa.
  const peek = await peekToken(token, purpose);
  if (!peek) return null;
  const owner = await db.user.findUnique({ where: { id: peek.userId }, select: { role: true } });
  if (owner?.role !== role) return null;
  const userId = await consumeToken(token, purpose);
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId }, include: { partner: true } });
  if (!user) return null;
  // A suspended account can't be re-activated via a reset link.
  const nextStatus = user.status === 'SUSPENDED' || user.partner?.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), status: nextStatus, failedLoginCount: 0, lockedUntil: null } });
  await destroyAllSessionsForUser(userId);
  await audit(userId, purpose === 'PASSWORD_SETUP' ? 'auth.password_setup' : 'auth.password_reset', 'User', userId);
  return user;
}

/** Always resolves the same way to the caller regardless of whether the account exists. */
export async function requestPasswordReset(email: string, locale: 'ka' | 'en', realm: 'partner' | 'admin' = 'partner') {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.status !== 'ACTIVE') return;
  if (realm === 'partner' && user.role !== 'PARTNER') return;
  if (realm === 'admin' && user.role !== 'SUPER_ADMIN') return;
  const token = await issueToken(user.id, 'PASSWORD_RESET');
  const resetUrl = realm === 'admin' ? `${appUrl()}/admin/reset?token=${encodeURIComponent(token)}` : `${appUrl()}/${locale}/account/reset?token=${encodeURIComponent(token)}`;
  await sendEmail(user.email, 'password_reset', T.passwordReset({ resetUrl, expiresMinutes: TOKEN_TTL.PASSWORD_RESET / 60000 }), { sensitive: true });
}

const LOCK_AFTER = 8;
const LOCK_MS = 15 * 60 * 1000;

export type LoginOutcome = { ok: true; userId: string; status: string } | { ok: false; reason: 'invalid' | 'locked' };

/** Generic failure for unknown email / wrong password; per-account lockout after repeated failures. */
export async function verifyLogin(email: string, password: string, role: 'PARTNER' | 'SUPER_ADMIN'): Promise<LoginOutcome> {
  const user = await db.user.findUnique({ where: { email } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await verifyPassword(null, password);
    return { ok: false, reason: 'locked' };
  }
  const valid = await verifyPassword(user?.role === role ? user.passwordHash : null, password);
  if (!user || user.role !== role || !valid) {
    if (user) {
      const n = user.failedLoginCount + 1;
      await db.user.update({ where: { id: user.id }, data: { failedLoginCount: n, lockedUntil: n >= LOCK_AFTER ? new Date(Date.now() + LOCK_MS) : null } });
    }
    return { ok: false, reason: 'invalid' };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  return { ok: true, userId: user.id, status: user.status };
}

export const ipKey = (ip: string) => hmac(ip);
