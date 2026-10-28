/**
 * `{{key}}` placeholders in CMS copy (used by the legal pages) are filled from
 * Admin → პარამეტრები at render time, so company details are entered once and
 * never hard-coded. Values are HTML-escaped; unknown keys are left untouched.
 *
 * `[[ … ]]` marks an optional fragment: it is shown only when every known
 * placeholder inside it has a value (e.g. `[[ტელეფონი: {{contact.phone}}]]`).
 * A missing company name falls back to "ASPOR"; other missing values render empty.
 */
export const TOKEN_KEYS = ['company.name', 'company.code', 'company.address', 'contact.email', 'contact.phone'] as const;

const FALLBACK: Record<string, string> = { 'company.name': 'ASPOR' };
const TOKEN_RE = /\{\{\s*([a-z]+\.[a-z]+)\s*\}\}/g;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const known = (k: string) => (TOKEN_KEYS as readonly string[]).includes(k);
const valueOf = (values: Record<string, string>, k: string) => values[k]?.trim() || FALLBACK[k] || '';

export function fillTokens(text: string, values: Record<string, string>): string {
  if (!text.includes('{{') && !text.includes('[[')) return text;
  const withOptional = text.replace(/\[\[([\s\S]*?)\]\]/g, (_, inner: string) => {
    const keys = [...inner.matchAll(TOKEN_RE)].map((m) => m[1]).filter(known);
    return keys.every((k) => valueOf(values, k)) ? inner : '';
  });
  return withOptional.replace(TOKEN_RE, (m, key: string) => (known(key) ? esc(valueOf(values, key)) : m));
}

/** Deep-applies fillTokens to every string inside a section's data. */
export function fillTokensDeep<T>(data: T, values: Record<string, string>): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return fillTokens(v, values);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(data) as T;
}
