import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, generateRecoveryCodes, matchTotpStep, totpAt, verifyTotp } from '@/lib/totp';
import { sanitizeRichText } from '@/lib/sanitize';
import { isSafeHref, safeRedirectPath } from '@/lib/urls';
import { slugify } from '@/lib/slug';
import { esc, applicationApproved } from '@/server/email/templates';
import { applicationSchema } from '@/lib/validation';
import { parseSection, collectLocalized, emptySection, SECTION_TYPES } from '@/lib/page-builder/registry';
import { sanitizeSectionData } from '@/server/services/content';
import { __test } from '@/server/services/media';

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 test vector for SHA-1: secret "12345678901234567890", T=59 → 94287082 (8 digits) → last 6: 287082
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  it('matches RFC test vector', () => {
    expect(totpAt(secret, 59_000)).toBe('287082');
    expect(totpAt(secret, 1111111109_000)).toBe('081804');
  });
  it('accepts ±1 step, rejects others', () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
  });
  it('returns the matched time step (used for single-use enforcement)', () => {
    const now = 1_700_000_000_000;
    expect(matchTotpStep(secret, totpAt(secret, now), now)).toBe(Math.floor(now / 30000));
  });
  it('base32 roundtrip + recovery code format', () => {
    expect(base32Decode(base32Encode(Buffer.from('hello'))).toString()).toBe('hello');
    expect(generateRecoveryCodes(3).every((c) => /^[a-z2-7]{5}-[a-z2-7]{5}$/.test(c))).toBe(true);
  });
});

describe('rich-text sanitising', () => {
  it('strips scripts, handlers, javascript: URLs, iframes, styles', () => {
    const dirty = '<p onclick="x()">hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><iframe src="https://e.vil"></iframe><img src=x onerror=alert(1)><style>*{}</style><a href="https://ok.ge" target="_blank">ok</a>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|iframe|<img|<style/i);
    expect(clean).toContain('<a href="https://ok.ge" target="_blank" rel="noopener noreferrer">ok</a>');
  });
  it('page-builder RichText data is sanitised before save', () => {
    const d = sanitizeSectionData('RichText', { heading: { ka: 'a', en: '' }, body: { ka: '<p>x</p><script>bad()</script>', en: '<img src=x onerror=1>' } });
    expect(JSON.stringify(d)).not.toMatch(/script|onerror/);
  });
});

describe('URL safety', () => {
  it('hrefs', () => {
    for (const ok of ['/ka/products', 'https://aspor.ge', 'mailto:a@b.ge', 'tel:+995', '#top']) expect(isSafeHref(ok)).toBe(true);
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'http://insecure.example', ' vbscript:x']) expect(isSafeHref(bad)).toBe(false);
  });
  it('open-redirect guard', () => {
    expect(safeRedirectPath('//evil.com', '/x')).toBe('/x');
    expect(safeRedirectPath('https://evil.com', '/x')).toBe('/x');
    expect(safeRedirectPath('/ka/account', '/x')).toBe('/ka/account');
    for (const bad of ['/\t/evil.com', '/%09/evil.com', '/\n/evil.com', '/ka//evil.com', '/ka\\evil', '/admin', 'javascript:x']) expect(safeRedirectPath(bad, '/x')).toBe('/x');
  });
  it('SSRF private address detection', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1', '100.64.0.1']) expect(__test.isPrivateIp(ip)).toBe(true);
    expect(__test.isPrivateIp('8.8.8.8')).toBe(false);
  });
});

describe('misc', () => {
  it('Georgian transliteration slugs', () => {
    expect(slugify('პაუერბანკები')).toBe('pauerbankebi');
    expect(slugify('ASPOR A313 PD+QC Fast')).toBe('aspor-a313-pd-qc-fast');
  });
  it('email templates escape user input', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
    const r = applicationApproved({ contactName: '<script>x</script>', setupUrl: 'https://aspor.ge/ka/account/setup?token=a"b', expiresHours: 72 });
    expect(r.html).not.toContain('<script>x</script>');
    expect(r.html).toContain('token=a&quot;b');
  });
  it('application validation', () => {
    const ok = applicationSchema.safeParse({ companyName: 'შპს ტესტი', companyCode: '405729699', contactName: 'ნინო', phone: '+995 555 12 34 56', email: 'A@Example.GE ', consent: 'on' });
    expect(ok.success && ok.data.email).toBe('a@example.ge');
    const bad = applicationSchema.safeParse({ companyName: 'x', companyCode: '123', contactName: '', phone: '12', email: 'no', consent: undefined });
    expect(bad.success).toBe(false);
  });
  it('page-builder registry: every type has a valid empty state; unknown types & unsafe links rejected', () => {
    for (const t of SECTION_TYPES) expect(parseSection(t, emptySection(t)).success).toBe(true);
    expect(parseSection('Script', {}).success).toBe(false);
    expect(parseSection('CTA', { buttonHref: 'javascript:alert(1)' }).success).toBe(false);
    expect(collectLocalized({ heading: { ka: 'სათაური', en: '' }, items: [{ q: { ka: 'კ', en: 'q' } }] }).map((x) => x.path)).toEqual(['heading', 'items.0.q']);
  });
});
