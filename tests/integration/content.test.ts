import { beforeEach, describe, expect, it } from 'vitest';
import { jar, resetDb } from './helpers';
import { db } from '@/lib/db';
import { createSession } from '@/server/auth/session';
import { addSectionAction, saveSectionAction, sectionOpAction, publishPageAction } from '@/server/actions/admin/content';
import { getPublishedPage } from '@/server/services/content';
import { saveProductAction } from '@/server/actions/admin/catalog';

async function adminSession(mfa = true) {
  const u = await db.user.create({ data: { email: 'a@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE', totpEnabledAt: new Date(), passwordHash: 'x' } });
  await createSession(u.id, 'admin', mfa);
  return u;
}
const fd = (o: Record<string, string>) => { const f = new FormData(); Object.entries(o).forEach(([k, v]) => f.set(k, v)); return f; };

beforeEach(async () => { await resetDb(); jar.clear(); });

describe('admin authorization', () => {
  it('admin actions require an admin session with MFA', async () => {
    await expect(saveProductAction({}, fd({ sku: 'X' }))).rejects.toThrow('REDIRECT:/admin/login');
    const u = await db.user.create({ data: { email: 'p@x.test', role: 'PARTNER', status: 'ACTIVE' } });
    await createSession(u.id, 'partner');
    jar.set('aspor_admin_sid', jar.get('aspor_sid')!);
    await expect(saveProductAction({}, fd({ sku: 'X' }))).rejects.toThrow('REDIRECT:/admin/login');
    jar.clear();
    await adminSession(false);
    await expect(saveProductAction({}, fd({ sku: 'X' }))).rejects.toThrow('REDIRECT:/admin/mfa');
  });
});

describe('page builder', () => {
  it('add, edit, reorder, hide, publish; drafts stay private until publish; scripts are stripped', async () => {
    await adminSession();
    const page = await db.page.create({ data: { key: 'about', slug: 'about', publishedAt: new Date(), translations: { create: { locale: 'ka', title: 'a' } } } });
    await addSectionAction(fd({ pageId: page.id, type: 'RichText' }));
    await addSectionAction(fd({ pageId: page.id, type: 'CTA' }));
    const [rt, cta] = await db.pageSection.findMany({ where: { pageId: page.id }, orderBy: { sortOrder: 'asc' } });
    expect((await saveSectionAction(rt.id, JSON.stringify({ heading: { ka: 'სათ', en: '' }, body: { ka: '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>', en: '' } }))).ok).toBe(true);
    expect((await saveSectionAction(cta.id, JSON.stringify({ buttonHref: 'javascript:alert(1)' }))).error).toMatch(/unsafe_url/);
    expect((await getPublishedPage('about'))?.sections).toHaveLength(0); // not yet published
    await sectionOpAction(fd({ id: cta.id, op: 'up' }));
    await sectionOpAction(fd({ id: rt.id, op: 'toggle' }));
    await publishPageAction(fd({ pageId: page.id }));
    const pub = await getPublishedPage('about');
    expect(pub?.sections.map((s) => s.type)).toEqual(['CTA']); // RichText hidden
    const saved = await db.pageSection.findUniqueOrThrow({ where: { id: rt.id } });
    expect(JSON.stringify(saved.data)).not.toMatch(/script|onerror/);
  });

  it('editing English text resets approval', async () => {
    await adminSession();
    const page = await db.page.create({ data: { key: 'p', slug: 'p', translations: { create: { locale: 'ka', title: 'a' } } } });
    await addSectionAction(fd({ pageId: page.id, type: 'CTA' }));
    const s = await db.pageSection.findFirstOrThrow();
    await saveSectionAction(s.id, JSON.stringify({ heading: { ka: 'ქ', en: 'E' } }));
    await sectionOpAction(fd({ id: s.id, op: 'approveEn' }));
    expect((await db.pageSection.findUniqueOrThrow({ where: { id: s.id } })).enStatus).toBe('APPROVED');
    await saveSectionAction(s.id, JSON.stringify({ heading: { ka: 'ქ', en: 'Edited' } }));
    expect((await db.pageSection.findUniqueOrThrow({ where: { id: s.id } })).enStatus).toBe('DRAFT_REVIEW');
  });
});

describe('translation adapter', () => {
  it('missing API key → not_configured, nothing stored as English', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { translateStrings } = await import('@/server/services/translation');
    await expect(translateStrings([{ id: 'name', ka: 'x' }], { entityType: 'product', entityId: 'p', adminId: 'a' })).rejects.toMatchObject({ code: 'not_configured' });
  });

  it('provider error is caught, logged and surfaced as provider_error', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-invalid';
    process.env.ANTHROPIC_MODEL = 'test-model-id';
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'boom' } }), { status: 500, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    try {
      const { translateStrings } = await import('@/server/services/translation');
      await expect(translateStrings([{ id: 'name', ka: 'x' }], { entityType: 'product', entityId: 'p', adminId: 'a' })).rejects.toMatchObject({ code: 'provider_error' });
      expect(await db.translationJob.count({ where: { status: 'FAILED' } })).toBe(1);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_MODEL;
    }
  });

  it('valid structured output is stored by caller as DRAFT_REVIEW (never auto-approved)', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    process.env.ANTHROPIC_MODEL = 'test-model-id';
    await adminSession();
    const c = await db.category.create({ data: { slug: 'c', translations: { create: { locale: 'ka', name: 'c' } } } });
    const p = await db.product.create({ data: { sku: 'T1', slug: 't1', categoryId: c.id, status: 'PUBLISHED', translations: { create: { locale: 'ka', name: 'დამტენი 20W' } } } });
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({
      id: 'msg_1', type: 'message', role: 'assistant', model: 'test-model-id', stop_reason: 'tool_use', stop_sequence: null,
      content: [{ type: 'tool_use', id: 'tu_1', name: 'submit_translations', input: { items: [{ id: 'name', en: 'Charger 20W' }] } }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    try {
      const { translateProductAction } = await import('@/server/actions/admin/catalog');
      expect((await translateProductAction({}, fd({ id: p.id }))).ok).toBe(true);
      const en = await db.productTranslation.findUniqueOrThrow({ where: { productId_locale: { productId: p.id, locale: 'en' } } });
      expect(en).toMatchObject({ name: 'Charger 20W', status: 'DRAFT_REVIEW' });
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_MODEL;
    }
  });
});

describe('admin MFA', () => {
  it('a TOTP code cannot be replayed; recovery codes are single-use', async () => {
    const { encrypt } = await import('@/lib/crypto');
    const { totpAt } = await import('@/lib/totp');
    const { hashPassword } = await import('@/lib/password');
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const u = await db.user.create({ data: { email: 'm@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE', totpEnabledAt: new Date(), totpSecretEnc: encrypt(secret), recoveryCodes: [await hashPassword('abcde-fghij')] } });
    const { adminMfaAction } = await import('@/server/actions/admin/auth');
    const code = totpAt(secret, Date.now());
    await createSession(u.id, 'admin', false);
    await expect(adminMfaAction({}, fd({ code }))).rejects.toThrow('REDIRECT:/admin');
    jar.clear();
    await createSession(u.id, 'admin', false);
    expect(await adminMfaAction({}, fd({ code }))).toEqual({ error: 'კოდი არასწორია.' });
    await expect(adminMfaAction({}, fd({ code: 'abcde-fghij' }))).rejects.toThrow('REDIRECT:/admin');
    jar.clear();
    await createSession(u.id, 'admin', false);
    expect(await adminMfaAction({}, fd({ code: 'abcde-fghij' }))).toEqual({ error: 'კოდი არასწორია.' });
  });
});
