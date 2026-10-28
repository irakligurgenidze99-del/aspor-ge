import { describe, expect, it } from 'vitest';
import { fillTokens, fillTokensDeep } from '@/lib/legal-tokens';

describe('legal tokens', () => {
  it('fills known keys, escapes HTML, marks missing values per locale', () => {
    const v = { 'company.name': 'შპს „ტესტი“ <b>', 'contact.email': 'a@b.ge' };
    expect(fillTokens('{{company.name}} / {{contact.email}}', v, 'ka')).toBe('შპს „ტესტი“ &lt;b&gt; / a@b.ge');
    expect(fillTokens('{{company.code}}', v, 'ka')).toContain('შეავსეთ');
    expect(fillTokens('{{company.code}}', v, 'en')).toContain('to be filled in');
    expect(fillTokens('{{other.key}} {{x}}', v, 'ka')).toBe('{{other.key}} {{x}}');
  });
  it('walks localized section data', () => {
    const out = fillTokensDeep({ body: { ka: '{{company.code}}', en: '{{company.code}}' } }, { 'company.code': '123456789' });
    expect(out).toEqual({ body: { ka: '123456789', en: '123456789' } });
  });
});
