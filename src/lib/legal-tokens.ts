/**
 * `{{key}}` placeholders in CMS copy (used by the legal pages) are filled from
 * Admin → პარამეტრები at render time, so company details are entered once and
 * never hard-coded. Values are HTML-escaped; unknown keys are left untouched.
 */
export const TOKEN_KEYS = ['company.name', 'company.code', 'company.address', 'contact.email', 'contact.phone'] as const;

const MISSING = { ka: '[შეავსეთ: ადმინი → პარამეტრები]', en: '[to be filled in: Admin → Settings]' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function fillTokens(text: string, values: Record<string, string>, locale: 'ka' | 'en'): string {
  if (!text.includes('{{')) return text;
  return text.replace(/\{\{\s*([a-z]+\.[a-z]+)\s*\}\}/g, (m, key: string) => {
    if (!(TOKEN_KEYS as readonly string[]).includes(key)) return m;
    const v = values[key]?.trim();
    return v ? esc(v) : MISSING[locale];
  });
}

/** Deep-applies fillTokens to every string inside a section's data. */
export function fillTokensDeep<T>(data: T, values: Record<string, string>): T {
  const walk = (v: unknown, loc: 'ka' | 'en'): unknown => {
    if (typeof v === 'string') return fillTokens(v, values, loc);
    if (Array.isArray(v)) return v.map((x) => walk(x, loc));
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k === 'en' ? 'en' : k === 'ka' ? 'ka' : loc)]));
    }
    return v;
  };
  return walk(data, 'ka') as T;
}
