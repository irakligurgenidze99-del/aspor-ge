import { describe, expect, it } from 'vitest';
import { fillTokens, fillTokensDeep } from '@/lib/legal-tokens';

describe('legal tokens', () => {
  it('fills known keys and escapes HTML', () => {
    expect(fillTokens('{{company.name}} / {{contact.email}}', { 'company.name': 'შპს <b>', 'contact.email': 'a@b.ge' })).toBe('შპს &lt;b&gt; / a@b.ge');
    expect(fillTokens('{{other.key}} {{x}}', {})).toBe('{{other.key}} {{x}}');
  });
  it('falls back to ASPOR and drops optional fragments with missing values', () => {
    const t = '<strong>{{company.name}}</strong>[[, ს/კ {{company.code}}]].<br>[[ელფოსტა: {{contact.email}}<br>]][[ტელეფონი: {{contact.phone}}<br>]]';
    expect(fillTokens(t, { 'contact.email': 'contact@aspor.ge' })).toBe('<strong>ASPOR</strong>.<br>ელფოსტა: contact@aspor.ge<br>');
  });
  it('walks localized section data', () => {
    expect(fillTokensDeep({ body: { ka: '{{company.code}}', en: '[[x {{contact.phone}}]]y' } }, { 'company.code': '123456789' })).toEqual({ body: { ka: '123456789', en: 'y' } });
  });
});
