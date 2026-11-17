/**
 * Admin password recovery on deploy (production build only).
 *
 * If SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD are set and that admin's current
 * password is different, the password is replaced, the lockout and login rate
 * limits for that admin are cleared and existing sessions are revoked.
 * MFA is kept (set ADMIN_RESET_MFA=1 to also require re-enrolment).
 * When the password already matches, nothing happens — so a leftover variable is a no-op.
 * Delete SEED_ADMIN_PASSWORD from Vercel after signing in.
 */
import 'dotenv/config';
import { db } from '../src/lib/db';
import { hashPassword, verifyPassword } from '../src/lib/password';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !pw) return console.log('admin-reset: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipped');
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.role !== 'SUPER_ADMIN') return console.log('admin-reset: no admin with that email — skipped (the seed creates it)');
  if (pw.length < 12 || !/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) throw new Error('admin-reset: SEED_ADMIN_PASSWORD must be ≥12 chars with letters and digits');
  if (await verifyPassword(user.passwordHash, pw)) return console.log('admin-reset: password already current — nothing to do');
  const resetMfa = process.env.ADMIN_RESET_MFA === '1';
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(pw), failedLoginCount: 0, lockedUntil: null, ...(resetMfa ? { totpEnabledAt: null, totpSecretEnc: null, totpLastStep: null, recoveryCodes: [] } : {}) },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.rateLimitHit.deleteMany({ where: { OR: [{ key: `admin-login-email:${email}` }, { key: { startsWith: 'admin-login:' } }, { key: { startsWith: `mfa:${user.id}:` } }] } }),
    db.auditLog.create({ data: { actorId: null, action: 'auth.admin_password_reset_on_deploy', entityType: 'User', entityId: user.id, meta: { mfaReset: resetMfa } } }),
  ]);
  console.log(`admin-reset: password for ${email} replaced${resetMfa ? ' and MFA reset' : ''}; lockout and login limits cleared`);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
