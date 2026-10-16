'use server';
import { redirect } from 'next/navigation';
import { applicationSchema, contactSchema, emailSchema, fieldErrors, loginSchema, phoneSchema } from '@/lib/validation';
import { passwordPolicyError, verifyPassword, hashPassword } from '@/lib/password';
import { safeRedirectPath } from '@/lib/urls';
import { db } from '@/lib/db';
import { clientIpHash } from '../request';
import { rateLimit, RATE_RULES } from '../rate-limit';
import { looksLikeBot } from '../antispam';
import { submitApplication, verifyLogin, requestPasswordReset, completePasswordSetup } from '../services/partners';
import { createSession, destroySession, getSession, destroyAllSessionsForUser } from '../auth/session';
import { sendEmail } from '../email';
import { contactAdminNotify } from '../email/templates';
import { audit } from '../audit';
import { z } from 'zod';

export type FormState = { ok?: boolean; error?: string; fields?: Record<string, string>; values?: Record<string, string> };

const locOf = (fd: FormData) => (fd.get('locale') === 'en' ? 'en' : 'ka') as 'ka' | 'en';
const vals = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? '').slice(0, 5000)]));

export async function applyAction(_: FormState, fd: FormData): Promise<FormState> {
  const keys = ['companyName', 'companyCode', 'contactName', 'phone', 'email', 'message'];
  const values = vals(fd, keys);
  if (looksLikeBot(fd)) return { ok: true }; // silent
  const ip = await clientIpHash();
  if (!(await rateLimit(`apply:${ip}`, RATE_RULES.application))) return { error: 'rate_limited', values };
  const parsed = applicationSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  try {
    await submitApplication(parsed.data, { ipHash: ip, locale: locOf(fd) });
  } catch (e) {
    console.error('[apply]', e);
    return { error: 'error', values };
  }
  return { ok: true };
}

export async function contactAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = vals(fd, ['name', 'email', 'phone', 'subject', 'message']);
  if (looksLikeBot(fd)) return { ok: true };
  const ip = await clientIpHash();
  if (!(await rateLimit(`contact:${ip}`, RATE_RULES.contact))) return { error: 'rate_limited', values };
  const parsed = contactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const d = parsed.data;
  const msg = await db.contactMessage.create({ data: { name: d.name, email: d.email, phone: d.phone || null, subject: d.subject || null, message: d.message, ipHash: ip, locale: locOf(fd) } });
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (to) {
    // Stored first; email is best-effort with retries via the outbox.
    await sendEmail(to, 'contact_admin_notify', contactAdminNotify({ ...d, adminUrl: `${(process.env.APP_URL ?? '').replace(/\/$/, '')}/admin/messages/${msg.id}` })).catch((e) => console.error('[contact email]', e));
  }
  return { ok: true };
}

export async function partnerLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = vals(fd, ['email']);
  const ip = await clientIpHash();
  const parsed = loginSchema.safeParse({ email: fd.get('email'), password: fd.get('password') });
  if (!parsed.success) return { error: 'invalid', values };
  if (!(await rateLimit(`login:${ip}`, RATE_RULES.login)) || !(await rateLimit(`login-email:${parsed.data.email}`, RATE_RULES.loginEmail))) return { error: 'rateLimited', values };
  const res = await verifyLogin(parsed.data.email, parsed.data.password, 'PARTNER');
  if (!res.ok) return { error: res.reason === 'locked' ? 'locked' : 'invalid', values };
  if (res.status === 'SUSPENDED') return { error: 'suspended', values };
  if (res.status !== 'ACTIVE') return { error: 'pendingSetup', values };
  await createSession(res.userId, 'partner');
  await audit(res.userId, 'auth.partner_login', 'User', res.userId);
  const locale = locOf(fd);
  redirect(safeRedirectPath(String(fd.get('next') ?? ''), `/${locale}/account`));
}

export async function partnerLogoutAction(fd: FormData) {
  await destroySession('partner');
  redirect(`/${locOf(fd)}`);
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIpHash();
  const email = emailSchema.safeParse(fd.get('email'));
  if (!(await rateLimit(`reset:${ip}`, RATE_RULES.reset))) return { error: 'rateLimited' };
  if (email.success && (await rateLimit(`reset-email:${email.data}`, RATE_RULES.reset))) {
    await requestPasswordReset(email.data, locOf(fd), 'partner').catch((e) => console.error('[reset]', e));
  }
  return { ok: true }; // identical response either way (no enumeration)
}

export async function setPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get('token') ?? '');
  const purpose = fd.get('purpose') === 'reset' ? 'PASSWORD_RESET' : 'PASSWORD_SETUP';
  const pw = String(fd.get('password') ?? '');
  if (pw !== String(fd.get('confirm') ?? '')) return { fields: { confirm: 'passwordMismatch' } };
  if (passwordPolicyError(pw)) return { fields: { password: 'passwordWeak' } };
  const ip = await clientIpHash();
  if (!(await rateLimit(`setpw:${ip}`, RATE_RULES.reset))) return { error: 'rateLimited' };
  const user = await completePasswordSetup(token, pw, purpose);
  if (!user) return { error: 'tokenInvalid' };
  return { ok: true };
}

const profileSchema = z.object({ contactName: z.string().trim().min(2).max(120), phone: phoneSchema, address: z.string().trim().max(300).optional().or(z.literal('')) });

/** Partners can edit ONLY their own non-identity fields; partner id comes from the session, never from the form. */
export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession('partner');
  if (!s || !s.user.partner) return { error: 'error' };
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  await db.b2BPartner.update({ where: { id: s.user.partner.id }, data: { contactName: parsed.data.contactName, phone: parsed.data.phone, address: parsed.data.address || null } });
  await audit(s.user.id, 'partner.profile_update', 'B2BPartner', s.user.partner.id);
  return { ok: true };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession('partner');
  if (!s) return { error: 'error' };
  const ip = await clientIpHash();
  if (!(await rateLimit(`chpw:${ip}`, RATE_RULES.reset))) return { error: 'rateLimited' };
  if (!(await verifyPassword(s.user.passwordHash, String(fd.get('current') ?? '')))) return { fields: { current: 'invalid' } };
  const pw = String(fd.get('password') ?? '');
  if (pw !== String(fd.get('confirm') ?? '')) return { fields: { confirm: 'passwordMismatch' } };
  if (passwordPolicyError(pw)) return { fields: { password: 'passwordWeak' } };
  await db.user.update({ where: { id: s.user.id }, data: { passwordHash: await hashPassword(pw) } });
  await destroyAllSessionsForUser(s.user.id);
  await createSession(s.user.id, 'partner');
  await audit(s.user.id, 'auth.password_change', 'User', s.user.id);
  return { ok: true };
}
