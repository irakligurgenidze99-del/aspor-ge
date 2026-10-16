import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jar, resetDb, makeCategory, makeProduct } from './helpers';
import { db } from '@/lib/db';
import { submitApplication, approveApplication, rejectApplication, completePasswordSetup, setPartnerSuspended, verifyLogin, requestPasswordReset } from '@/server/services/partners';
import { issueToken, consumeToken } from '@/server/services/tokens';
import { createSession } from '@/server/auth/session';
import { getPricesForViewer } from '@/server/services/pricing';
import { listPublicProducts, getPublicProduct } from '@/server/services/catalog';
import * as actions from '@/server/actions/public';

const input = { companyName: 'შპს ტესტი', companyCode: '400000001', contactName: 'ნინო', phone: '995555123456', email: 'shop@example.test', message: '', consent: 'on' as const };
const ctx = { ipHash: 'h', locale: 'ka' };

async function fullPartner(email = 'shop@example.test', code = '400000001') {
  const r = await submitApplication({ ...input, email, companyCode: code }, ctx);
  if (r.duplicate) throw new Error('dup');
  const admin = await db.user.create({ data: { email: `admin-${code}@x.test`, role: 'SUPER_ADMIN', status: 'ACTIVE' } });
  const userId = await approveApplication(r.id, admin.id);
  const token = await issueToken(userId, 'PASSWORD_SETUP');
  await completePasswordSetup(token, 'Passw0rdLong!', 'PASSWORD_SETUP');
  return { userId, adminId: admin.id, appId: r.id };
}

beforeEach(async () => {
  await resetDb();
  jar.clear();
  vi.restoreAllMocks();
});

describe('application → approval → password setup', () => {
  it('stores application, sends acknowledgement, approval creates partner + one-time setup email', async () => {
    const r = await submitApplication(input, ctx);
    expect(r.duplicate).toBe(false);
    const ack = await db.emailLog.findFirst({ where: { to: input.email, template: 'application_received' } });
    expect(ack?.status).toBe('SENT');
    const admin = await db.user.create({ data: { email: 'a@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE' } });
    const userId = await approveApplication((r as { id: string }).id, admin.id);
    const u = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { partner: true } });
    expect(u.status).toBe('PENDING_SETUP');
    expect(u.partner?.companyCode).toBe(input.companyCode);
    const mail = await db.emailLog.findFirst({ where: { to: input.email, template: 'secure:application_approved' } });
    expect(mail?.status).toBe('SENT');
    expect(mail?.html).toMatch(/redacted/); // one-time link not retained after delivery
    expect(await db.authToken.count({ where: { userId, purpose: 'PASSWORD_SETUP' } })).toBe(1);
    const tok = await db.authToken.findFirstOrThrow({ where: { userId } });
    expect(tok.tokenHash).toMatch(/^[a-f0-9]{64}$/); // only a hash is stored
  });

  it('duplicate email / company code is not re-created and response is indistinguishable', async () => {
    await submitApplication(input, ctx);
    const again = await submitApplication({ ...input, email: 'other@example.test' }, ctx);
    expect(again.duplicate).toBe(true);
    expect(await db.partnershipApplication.count()).toBe(1);
  });

  it('cannot approve twice or approve a rejected application', async () => {
    const r = (await submitApplication(input, ctx)) as { id: string };
    const admin = await db.user.create({ data: { email: 'a@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE' } });
    await rejectApplication(r.id, admin.id, 'n');
    await expect(approveApplication(r.id, admin.id)).rejects.toThrow('not_pending');
    expect(await db.emailLog.count({ where: { template: 'application_rejected' } })).toBe(1);
  });

  it('setup token is one-time and expires', async () => {
    const { userId } = await fullPartner();
    const t = await issueToken(userId, 'PASSWORD_SETUP');
    expect(await consumeToken(t, 'PASSWORD_SETUP')).toBe(userId);
    expect(await consumeToken(t, 'PASSWORD_SETUP')).toBeNull();
    const t2 = await issueToken(userId, 'PASSWORD_RESET');
    await db.authToken.updateMany({ where: { purpose: 'PASSWORD_RESET' }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await consumeToken(t2, 'PASSWORD_RESET')).toBeNull();
    expect(await consumeToken(t2, 'PASSWORD_SETUP')).toBeNull(); // wrong purpose
  });

  it('reset tokens are bound to their realm (admin token unusable on partner form and vice versa)', async () => {
    const { userId, adminId } = await fullPartner();
    const pt = await issueToken(userId, 'PASSWORD_RESET');
    expect(await completePasswordSetup(pt, 'NewPassw0rdXYZ', 'PASSWORD_RESET', 'SUPER_ADMIN')).toBeNull();
    expect(await db.authToken.count({ where: { userId, usedAt: null, purpose: 'PASSWORD_RESET' } })).toBe(1); // not consumed
    const at = await issueToken(adminId, 'PASSWORD_RESET');
    expect(await completePasswordSetup(at, 'short1pass', 'PASSWORD_RESET', 'PARTNER')).toBeNull();
  });

  it('issuing a new token invalidates the previous one', async () => {
    const { userId } = await fullPartner();
    const a = await issueToken(userId, 'PASSWORD_RESET');
    const b = await issueToken(userId, 'PASSWORD_RESET');
    expect(await consumeToken(a, 'PASSWORD_RESET')).toBeNull();
    expect(await consumeToken(b, 'PASSWORD_RESET')).toBe(userId);
  });

  it('password reset is silent for unknown emails and sends for real ones', async () => {
    await requestPasswordReset('nobody@example.test', 'ka');
    expect(await db.emailLog.count({ where: { to: 'nobody@example.test' } })).toBe(0);
    await fullPartner();
    await requestPasswordReset(input.email, 'ka');
    expect(await db.emailLog.count({ where: { to: input.email, template: 'secure:password_reset' } })).toBe(1);
  });

  it('login lockout after repeated failures', async () => {
    await fullPartner();
    for (let i = 0; i < 8; i++) expect((await verifyLogin(input.email, 'wrong-pass1', 'PARTNER')).ok).toBe(false);
    expect(await verifyLogin(input.email, 'Passw0rdLong!', 'PARTNER')).toEqual({ ok: false, reason: 'locked' });
  });

  it('partner credentials cannot log into the admin realm', async () => {
    await fullPartner();
    expect((await verifyLogin(input.email, 'Passw0rdLong!', 'SUPER_ADMIN')).ok).toBe(false);
  });
});

describe('protected wholesale prices', () => {
  it('anonymous: no prices; public DTOs never contain price fields', async () => {
    const c = await makeCategory();
    const p = await makeProduct('A1', c.id, { price: '19.90' });
    expect(await getPricesForViewer([p.id])).toBeNull();
    const list = await listPublicProducts({ locale: 'ka' });
    const detail = await getPublicProduct('a1', 'ka');
    const blob = JSON.stringify({ list, detail });
    expect(blob).not.toMatch(/19\.9|amountGel|price/i);
  });

  it('active partner sees the single shared price; pending/suspended/old sessions do not', async () => {
    const c = await makeCategory();
    const p = await makeProduct('A1', c.id, { price: '19.90' });
    const { userId, adminId } = await fullPartner();
    await createSession(userId, 'partner');
    expect((await getPricesForViewer([p.id]))?.get(p.id)).toBe('19.90');

    // second partner sees the same price (no tiers)
    const other = await fullPartner('b@example.test', '400000002');
    const token = [...jar.entries()];
    jar.clear();
    await createSession(other.userId, 'partner');
    expect((await getPricesForViewer([p.id]))?.get(p.id)).toBe('19.90');
    jar.clear();
    token.forEach(([k, v]) => jar.set(k, v));

    // suspend → immediate loss, even with the old cookie (sessions revoked + status re-checked)
    const partner = await db.b2BPartner.findFirstOrThrow({ where: { userId } });
    const oldCookie = jar.get('aspor_sid')!;
    await setPartnerSuspended(partner.id, true, adminId);
    jar.set('aspor_sid', oldCookie);
    expect(await getPricesForViewer([p.id])).toBeNull();

    // even if a session row somehow survived, the live status check blocks access
    await setPartnerSuspended(partner.id, false, adminId);
    await createSession(userId, 'partner');
    await db.b2BPartner.update({ where: { id: partner.id }, data: { status: 'SUSPENDED' } });
    expect(await getPricesForViewer([p.id])).toBeNull();
  });

  it('approved partner who has not set a password (PENDING_SETUP) gets no prices', async () => {
    const c = await makeCategory();
    const p = await makeProduct('A1', c.id, { price: '5.00' });
    const r = (await submitApplication(input, ctx)) as { id: string };
    const admin = await db.user.create({ data: { email: 'a@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE' } });
    const userId = await approveApplication(r.id, admin.id);
    await createSession(userId, 'partner');
    expect(await getPricesForViewer([p.id])).toBeNull();
  });

  it('admin session cookie does not grant partner pricing; partner cookie cannot be replayed as admin', async () => {
    const c = await makeCategory();
    const p = await makeProduct('A1', c.id, { price: '5.00' });
    const admin = await db.user.create({ data: { email: 'a@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE' } });
    await createSession(admin.id, 'admin');
    jar.set('aspor_sid', jar.get('aspor_admin_sid')!); // replay admin token in partner cookie
    expect(await getPricesForViewer([p.id])).toBeNull();
    jar.clear();
    const { userId } = await fullPartner();
    await createSession(userId, 'partner');
    jar.set('aspor_admin_sid', jar.get('aspor_sid')!);
    const { getSession } = await import('@/server/auth/session');
    expect(await getSession('admin')).toBeNull();
  });

  it('drafts and hidden products are not public; each colour SKU is independent', async () => {
    const c = await makeCategory();
    await makeProduct('A1-BLACK', c.id);
    await makeProduct('A1-WHITE', c.id);
    await makeProduct('DRAFT-1', c.id, { status: 'DRAFT' });
    const hidden = await makeProduct('HID-1', c.id);
    await db.product.update({ where: { id: hidden.id }, data: { isHidden: true } });
    const list = await listPublicProducts({ locale: 'ka' });
    expect(list.items.map((i) => i.sku).sort()).toEqual(['A1-BLACK', 'A1-WHITE']);
    expect(await getPublicProduct('draft-1', 'ka')).toBeNull();
    expect((await listPublicProducts({ locale: 'ka', q: 'a1-wh' })).items.map((i) => i.sku)).toEqual(['A1-WHITE']);
  });

  it('English shows only APPROVED translations, else falls back to Georgian', async () => {
    const c = await makeCategory();
    await makeProduct('E1', c.id, { en: 'DRAFT_REVIEW' });
    await makeProduct('E2', c.id, { en: 'APPROVED' });
    const en = await listPublicProducts({ locale: 'en' });
    const byS = Object.fromEntries(en.items.map((i) => [i.sku, i]));
    expect(byS.E1.name).toBe('პროდუქტი E1');
    expect(byS.E1.fallback).toBe(true);
    expect(byS.E2.name).toBe('Product E2');
  });
});

describe('profile isolation & public actions', () => {
  it('profile update only touches the session partner, ignoring any id in the form', async () => {
    const a = await fullPartner('a@example.test', '400000011');
    const b = await fullPartner('b@example.test', '400000012');
    await createSession(a.userId, 'partner');
    const bPartner = await db.b2BPartner.findFirstOrThrow({ where: { userId: b.userId } });
    const fd = new FormData();
    fd.set('id', bPartner.id);
    fd.set('contactName', 'Hacker');
    fd.set('phone', '995555000000');
    fd.set('role', 'SUPER_ADMIN');
    expect((await actions.updateProfileAction({}, fd)).ok).toBe(true);
    expect((await db.b2BPartner.findUniqueOrThrow({ where: { id: bPartner.id } })).contactName).toBe('ნინო');
    expect((await db.user.findUniqueOrThrow({ where: { id: a.userId } })).role).toBe('PARTNER');
  });

  it('contact form stores message and attempts admin notification', async () => {
    process.env.ADMIN_NOTIFY_EMAIL = 'ops@example.test';
    process.env.ANTISPAM_MIN_MS = '0';
    const { formTicket } = await import('@/server/antispam');
    const fd = new FormData();
    Object.entries({ name: 'გიორგი', email: 'g@example.test', message: 'გამარჯობა, მაინტერესებს პარტნიორობა.', consent: 'on', ft: formTicket(), locale: 'ka' }).forEach(([k, v]) => fd.set(k, v));
    expect((await actions.contactAction({}, fd)).ok).toBe(true);
    expect(await db.contactMessage.count()).toBe(1);
    expect(await db.emailLog.count({ where: { to: 'ops@example.test', template: 'contact_admin_notify' } })).toBe(1);
  });

  it('honeypot submissions are silently dropped', async () => {
    const fd = new FormData();
    Object.entries({ name: 'bot', email: 'b@example.test', message: 'spam spam spam', consent: 'on', website: 'http://spam', ft: 'x.y' }).forEach(([k, v]) => fd.set(k, v));
    expect((await actions.contactAction({}, fd)).ok).toBe(true);
    expect(await db.contactMessage.count()).toBe(0);
  });

  it('rate limit blocks repeated applications from one IP', async () => {
    process.env.ANTISPAM_MIN_MS = '0';
    const { formTicket } = await import('@/server/antispam');
    let last = {} as Awaited<ReturnType<typeof actions.applyAction>>;
    for (let i = 0; i < 6; i++) {
      const fd = new FormData();
      Object.entries({ ...input, email: `s${i}@example.test`, companyCode: `40000010${i}`, ft: formTicket() }).forEach(([k, v]) => fd.set(k, String(v)));
      last = await actions.applyAction({}, fd);
    }
    expect(last.error).toBe('rate_limited');
    expect(await db.partnershipApplication.count()).toBe(5);
  });
});
