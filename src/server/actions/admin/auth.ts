'use server';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { emailSchema, loginSchema } from '@/lib/validation';
import { encrypt, decrypt } from '@/lib/crypto';
import { generateRecoveryCodes, generateTotpSecret, matchTotpStep, otpauthUri, verifyTotp } from '@/lib/totp';
import { hashPassword, passwordPolicyError, verifyPassword } from '@/lib/password';
import { clientIpHash } from '../../request';
import { rateLimit, RATE_RULES } from '../../rate-limit';
import { verifyLogin, requestPasswordReset, completePasswordSetup } from '../../services/partners';
import { createSession, destroySession, getSession, markMfaPassed } from '../../auth/session';
import { requireAdmin } from '../../auth/guards';
import { audit } from '../../audit';

export type AState = { ok?: boolean; error?: string; data?: Record<string, unknown> };

export async function adminLoginAction(_: AState, fd: FormData): Promise<AState> {
  const ip = await clientIpHash();
  const parsed = loginSchema.safeParse({ email: fd.get('email'), password: fd.get('password') });
  if (!parsed.success) return { error: 'ელფოსტა ან პაროლი არასწორია.' };
  if (!(await rateLimit(`admin-login:${ip}`, RATE_RULES.login)) || !(await rateLimit(`admin-login-email:${parsed.data.email}`, RATE_RULES.loginEmail)))
    return { error: 'ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით.' };
  const res = await verifyLogin(parsed.data.email, parsed.data.password, 'SUPER_ADMIN');
  if (!res.ok || res.status !== 'ACTIVE') {
    await audit(null, 'auth.admin_login_failed', 'User', undefined, { reason: res.ok ? 'inactive' : res.reason });
    return { error: res.ok ? 'ანგარიში არ არის აქტიური.' : res.reason === 'locked' ? 'ანგარიში დროებით დაბლოკილია.' : 'ელფოსტა ან პაროლი არასწორია.' };
  }
  await createSession(res.userId, 'admin', false);
  await audit(res.userId, 'auth.admin_login', 'User', res.userId);
  redirect('/admin/mfa');
}

export async function adminLogoutAction() {
  const s = await getSession('admin');
  await destroySession('admin');
  if (s) await audit(s.user.id, 'auth.admin_logout', 'User', s.user.id);
  redirect('/admin/login');
}

/** Verify TOTP or a one-time recovery code for the current (password-authenticated) admin session. */
export async function adminMfaAction(_: AState, fd: FormData): Promise<AState> {
  const s = await getSession('admin');
  if (!s) redirect('/admin/login');
  const ip = await clientIpHash();
  if (!(await rateLimit(`mfa:${s.user.id}:${ip}`, RATE_RULES.mfa))) return { error: 'ძალიან ბევრი მცდელობა.' };
  const code = String(fd.get('code') ?? '').trim();
  const u = s.user;
  if (!u.totpSecretEnc || !u.totpEnabledAt) redirect('/admin/mfa/setup');
  let ok = false;
  const step = matchTotpStep(decrypt(u.totpSecretEnc), code);
  if (step !== null) {
    // Replay protection: each time step can be used once (atomic compare-and-set).
    const r = await db.user.updateMany({ where: { id: u.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] }, data: { totpLastStep: step } });
    ok = r.count === 1;
  }
  if (!ok && /^[a-z0-9]{5}-[a-z0-9]{5}$/i.test(code)) {
    const fresh = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { recoveryCodes: true } });
    for (const [i, h] of fresh.recoveryCodes.entries()) {
      if (await verifyPassword(h, code.toLowerCase())) {
        // Atomic: only succeeds if the list is unchanged since we read it (no double use in parallel).
        const r = await db.user.updateMany({ where: { id: u.id, recoveryCodes: { equals: fresh.recoveryCodes } }, data: { recoveryCodes: fresh.recoveryCodes.filter((_, j) => j !== i) } });
        if (r.count === 1) {
          await audit(u.id, 'auth.recovery_code_used', 'User', u.id, { remaining: fresh.recoveryCodes.length - 1 });
          ok = true;
        }
        break;
      }
    }
  }
  if (!ok) {
    await audit(u.id, 'auth.mfa_failed', 'User', u.id);
    return { error: 'კოდი არასწორია.' };
  }
  await markMfaPassed('admin');
  redirect('/admin');
}

/** Step 1 of enrollment: create a pending secret (stored encrypted, not yet enabled). */
export async function startMfaEnrollment() {
  const u = await requireAdmin({ allowPendingMfa: true });
  // Already enrolled → re-enrollment goes through /admin/security (requires the current code).
  if (u.totpEnabledAt) redirect('/admin/security');
  // Reuse a pending (not yet confirmed) secret so re-renders / reloads don't invalidate a scanned QR code.
  const fresh = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { totpSecretEnc: true } });
  let secret = fresh.totpSecretEnc ? decrypt(fresh.totpSecretEnc) : '';
  if (!secret) {
    secret = generateTotpSecret();
    await db.user.update({ where: { id: u.id }, data: { totpSecretEnc: encrypt(secret) } });
  }
  const uri = otpauthUri(secret, u.email);
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), uri };
}

export async function confirmMfaEnrollment(_: AState, fd: FormData): Promise<AState> {
  const u = await requireAdmin({ allowPendingMfa: true });
  const fresh = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!fresh.totpSecretEnc) return { error: 'ჯერ დააგენერირეთ საიდუმლო.' };
  const step = matchTotpStep(decrypt(fresh.totpSecretEnc), String(fd.get('code') ?? ''));
  if (step === null) return { error: 'კოდი არასწორია. შეამოწმეთ მოწყობილობის დრო.' };
  const codes = generateRecoveryCodes(8);
  await db.user.update({ where: { id: u.id }, data: { totpEnabledAt: new Date(), totpLastStep: step, recoveryCodes: await Promise.all(codes.map((c) => hashPassword(c))) } });
  await markMfaPassed('admin');
  await audit(u.id, 'auth.mfa_enrolled', 'User', u.id);
  return { ok: true, data: { codes } };
}

export async function regenerateRecoveryCodes(): Promise<AState> {
  const u = await requireAdmin();
  const codes = generateRecoveryCodes(8);
  await db.user.update({ where: { id: u.id }, data: { recoveryCodes: await Promise.all(codes.map((c) => hashPassword(c))) } });
  await audit(u.id, 'auth.recovery_codes_regenerated', 'User', u.id);
  return { ok: true, data: { codes } };
}

export async function adminForgotAction(_: AState, fd: FormData): Promise<AState> {
  const ip = await clientIpHash();
  if (!(await rateLimit(`admin-reset:${ip}`, RATE_RULES.reset))) return { error: 'ძალიან ბევრი მოთხოვნა.' };
  const e = emailSchema.safeParse(fd.get('email'));
  if (e.success) await requestPasswordReset(e.data, 'ka', 'admin').catch(() => {});
  return { ok: true };
}

export async function adminResetAction(_: AState, fd: FormData): Promise<AState> {
  const pw = String(fd.get('password') ?? '');
  if (pw !== String(fd.get('confirm') ?? '')) return { error: 'პაროლები არ ემთხვევა.' };
  if (passwordPolicyError(pw) || pw.length < 12) return { error: 'ადმინის პაროლი: მინიმუმ 12 სიმბოლო, ასო და ციფრი.' };
  const user = await completePasswordSetup(String(fd.get('token') ?? ''), pw, 'PASSWORD_RESET', 'SUPER_ADMIN');
  if (!user) return { error: 'ბმული არასწორია ან ვადაგასულია.' };
  return { ok: true };
}

/** Re-enroll: confirm with a current TOTP code, then disable and send to setup. */
export async function resetMfaAction(_: AState, fd: FormData): Promise<AState> {
  const u = await requireAdmin();
  if (!u.totpSecretEnc || !verifyTotp(decrypt(u.totpSecretEnc), String(fd.get('code') ?? ''))) return { error: 'კოდი არასწორია.' };
  await db.user.update({ where: { id: u.id }, data: { totpEnabledAt: null, totpSecretEnc: null, recoveryCodes: [] } });
  await audit(u.id, 'auth.mfa_reset', 'User', u.id);
  redirect('/admin/mfa/setup');
}
