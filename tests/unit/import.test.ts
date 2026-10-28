import { describe, expect, it } from 'vitest';
import { buildPlan, escapeCell, normalizeRow, parsePrice, parseSpecs, parseStatus, type ExistingSnapshot } from '@/lib/import/core';
import { suggestMapping } from '@/lib/import/fields';

const headers = ['SKU', 'category', 'name_ka', 'wholesale_price_gel_vat_included', 'status', 'images', 'specifications', 'spec: Weight'];
const mapping = suggestMapping(headers);
const row = (o: Record<string, string>) => ({ SKU: '', category: 'chargers', name_ka: 'დამტენი', wholesale_price_gel_vat_included: '', status: '', images: '', specifications: '', 'spec: Weight': '', ...o });
const ex = (sku: string, o: Partial<ExistingSnapshot> = {}): ExistingSnapshot => ({
  id: `id-${sku}`, sku, categorySlug: 'chargers', nameKa: 'დამტენი', descriptionKa: null, nameEn: null, descriptionEn: null, price: null, retailPrice: null,
  status: 'PUBLISHED', isHidden: false, hiddenByImport: false, color: null, modelNumber: null, imageRefs: [], specs: [], featured: false, sortOrder: 0, ...o,
});
const cats = [{ slug: 'chargers', names: ['დამტენები', 'Chargers'] }];

describe('mapping', () => {
  it('auto-suggests canonical fields and spec columns', () => {
    expect(mapping.fields.sku).toBe('SKU');
    expect(mapping.fields.wholesale_price_gel_vat_included).toBe('wholesale_price_gel_vat_included');
    expect(mapping.specColumns).toEqual(['spec: Weight']);
  });
});

describe('field parsing', () => {
  it('prices', () => {
    expect(parsePrice('12,5')).toEqual({ value: '12.50' });
    expect(parsePrice('₾ 0')).toEqual({ value: '0.00' });
    expect(parsePrice('-1').error).toBe('invalid_price');
    expect(parsePrice('1.234').error).toBe('invalid_price');
    expect(parsePrice('abc').error).toBe('invalid_price');
    expect(parsePrice('')).toEqual({});
  });
  it('status values (en + ka)', () => {
    expect(parseStatus('Published').value).toBe('PUBLISHED');
    expect(parseStatus('დრაფტი').value).toBe('DRAFT');
    expect(parseStatus('maybe').error).toBe('invalid_status');
  });
  it('specs text', () => {
    expect(parseSpecs('Capacity: 10000mAh\nUSB-C Input：5V-3A\nno colon line')).toEqual([
      { key: 'capacity', labelKa: 'Capacity', value: '10000mAh' },
      { key: 'usb_c_input', labelKa: 'USB-C Input', value: '5V-3A' },
    ]);
  });
});

describe('row validation', () => {
  it('requires sku/category/name and validates formats', () => {
    const r = normalizeRow(row({ SKU: '', name_ka: '' , category: ''}), mapping);
    expect(r.errors).toEqual(expect.arrayContaining(['sku: required', 'category: required', 'name_ka: required']));
    expect(normalizeRow(row({ SKU: 'bad sku!' }), mapping).errors).toContain('sku: invalid_format');
    expect(normalizeRow(row({ SKU: 'A1', images: 'http://x.test/a.jpg' }), mapping).errors[0]).toMatch(/https_only/);
    expect(normalizeRow(row({ SKU: 'A1', images: 'javascript:alert(1)' }), mapping).errors[0]).toMatch(/https_only/);
  });
  it('strips exporter apostrophe from formula-like cells', () => {
    const r = normalizeRow(row({ SKU: 'A1', name_ka: "'=HYPERLINK(1)" }), mapping);
    expect(r.row?.nameKa).toBe('=HYPERLINK(1)'); // stored as inert text
  });
  it('merges spec columns', () => {
    const r = normalizeRow(row({ SKU: 'A1', specifications: 'Capacity: 5000mAh', 'spec: Weight': '120 g' }), mapping);
    expect(r.row?.specs?.map((s) => s.labelKa)).toEqual(['Capacity', 'Weight']);
  });
});

describe('plan', () => {
  it('classifies create / update / unchanged / invalid and rejects duplicate SKUs', () => {
    const plan = buildPlan(
      [row({ SKU: 'NEW-1' }), row({ SKU: 'OLD-1', wholesale_price_gel_vat_included: '20' }), row({ SKU: 'OLD-2' }), row({ SKU: 'DUP' }), row({ SKU: 'dup' })],
      mapping, [ex('OLD-1', { price: '10.00' }), ex('OLD-2')], cats, 'PARTIAL',
    );
    expect(plan.rows.map((r) => r.action)).toEqual(['CREATE', 'UPDATE', 'UNCHANGED', 'INVALID', 'INVALID']);
    expect(plan.rows[1].diff).toEqual({ price: ['10.00', '20.00'] });
    expect(plan.rows[3].errors).toContain('sku: duplicate_in_file');
    expect(plan.hide).toEqual([]);
  });
  it('partial import never hides absent SKUs', () => {
    const plan = buildPlan([row({ SKU: 'A' })], mapping, [ex('A'), ex('B'), ex('C')], cats, 'PARTIAL');
    expect(plan.totals.hide).toBe(0);
  });
  it('full-catalog import hides absent, visible SKUs only', () => {
    const plan = buildPlan([row({ SKU: 'A' })], mapping, [ex('A'), ex('B'), ex('C', { isHidden: true })], cats, 'FULL_CATALOG');
    expect(plan.hide.map((h) => h.sku)).toEqual(['B']);
  });
  it('re-appearing hidden SKU is un-hidden; repeated import is unchanged', () => {
    const p1 = buildPlan([row({ SKU: 'A' })], mapping, [ex('A', { isHidden: true, hiddenByImport: true })], cats, 'FULL_CATALOG');
    expect(buildPlan([row({ SKU: 'A' })], mapping, [ex('A', { isHidden: true })], cats, 'PARTIAL').rows[0].action).toBe('UNCHANGED'); // manual hide is respected
    expect(p1.rows[0].diff).toEqual({ hidden: [true, false] });
    const p2 = buildPlan([row({ SKU: 'A' })], mapping, [ex('A')], cats, 'FULL_CATALOG');
    expect(p2.rows[0].action).toBe('UNCHANGED');
  });
  it('resolves category by name and flags new categories', () => {
    const plan = buildPlan([row({ SKU: 'A', category: 'დამტენები' }), row({ SKU: 'B', category: 'Car Kits' })], mapping, [], cats, 'PARTIAL');
    expect(plan.rows[0].categorySlug).toBe('chargers');
    expect(plan.totals.newCategories).toEqual(['car-kits']);
  });
});

describe('export escaping', () => {
  it('neutralises formula injection', () => {
    for (const v of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\t=x']) expect(escapeCell(v).startsWith("'")).toBe(true);
    expect(escapeCell('A313')).toBe('A313');
    expect(escapeCell(null)).toBe('');
  });
});
