// Pure import logic (no DB): normalisation, validation, diffing and planning.
// Unit-tested in tests/unit/import.test.ts.
import { slugify } from '../slug';
import type { Mapping } from './fields';

export type RawRow = Record<string, string>;
export type Spec = { key: string; labelKa: string; value: string };

export type NormalizedRow = {
  sku: string;
  category: string;
  categoryNameKa?: string;
  categoryNameEn?: string;
  nameKa: string;
  descriptionKa?: string;
  nameEn?: string;
  descriptionEn?: string;
  price?: string; // "12.50" — undefined = leave unchanged
  retailPrice?: string; // same semantics, public retail price
  status?: 'DRAFT' | 'PUBLISHED'; // undefined = unchanged (new → DRAFT)
  color?: string;
  modelNumber?: string;
  images?: string[]; // undefined = unchanged
  specs?: Spec[]; // undefined = unchanged
  featured?: boolean;
  sortOrder?: number;
};

export const LIMITS = { maxRows: 5000, maxCols: 80, maxCell: 10_000, sku: 64, name: 200, description: 5000, specs: 60 };
const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/ ]{0,63}$/;

// Strips the apostrophe our exporter adds to neutralise formula-like cells ('=…, '+…, '-…, '@…).
const get = (raw: RawRow, col?: string) => (col ? (raw[col] ?? '').toString().trim().replace(/^'(?=[=+\-@])/, '') : '');

export function parsePrice(v: string): { value?: string; error?: string } {
  if (!v) return {};
  const cleaned = v.replace(/[₾\s]|gel|lari/gi, '').replace(/,/g, '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { error: 'invalid_price' };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return { error: 'invalid_price' };
  if (n > 1_000_000) return { error: 'price_too_large' };
  return { value: n.toFixed(2) };
}

export function parseStatus(v: string): { value?: 'DRAFT' | 'PUBLISHED'; error?: string } {
  if (!v) return {};
  const s = v.toLowerCase().trim();
  if (['draft', 'დრაფტი', 'მონახაზი', 'hidden', '0', 'no'].includes(s)) return { value: 'DRAFT' };
  if (['published', 'publish', 'გამოქვეყნებული', 'გამოქვეყნება', 'live', '1', 'yes'].includes(s)) return { value: 'PUBLISHED' };
  return { error: 'invalid_status' };
}

export function parseSpecs(text: string): Spec[] {
  const out: Spec[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n|;(?=\s*[^;:]+:)/)) {
    const m = line.match(/^\s*([^:：]{1,80})[:：]\s*(.+?)\s*$/);
    if (!m) continue;
    const label = m[1].trim();
    let key = slugify(label, 40).replace(/-/g, '_');
    let n = 2;
    while (seen.has(key)) key = `${slugify(label, 36).replace(/-/g, '_')}_${n++}`;
    seen.add(key);
    out.push({ key, labelKa: label, value: m[2].slice(0, 500) });
  }
  return out;
}

export function splitImages(v: string): string[] {
  return v.split(/[|\n]+/).map((s) => s.trim()).filter(Boolean);
}

export function isAllowedImageRef(ref: string): boolean {
  if (/^media:[a-z0-9]{10,40}$/i.test(ref)) return true;
  try {
    return new URL(ref).protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeRow(raw: RawRow, mapping: Mapping): { row?: NormalizedRow; errors: string[] } {
  const m = mapping.fields;
  const errors: string[] = [];
  const sku = get(raw, m.sku);
  const category = get(raw, m.category);
  const nameKa = get(raw, m.name_ka);
  if (!sku) errors.push('sku: required');
  else if (!SKU_RE.test(sku)) errors.push('sku: invalid_format');
  if (!category) errors.push('category: required');
  if (!nameKa) errors.push('name_ka: required');
  if (nameKa.length > LIMITS.name) errors.push('name_ka: too_long');
  for (const [k, max] of [['description_ka', LIMITS.description], ['description_en', LIMITS.description], ['name_en', LIMITS.name]] as const) {
    if (get(raw, m[k]).length > max) errors.push(`${k}: too_long`);
  }
  const price = parsePrice(get(raw, m.wholesale_price_gel_vat_included));
  if (price.error) errors.push(`wholesale_price_gel_vat_included: ${price.error}`);
  const retail = parsePrice(get(raw, m.retail_price_gel_vat_included));
  if (retail.error) errors.push(`retail_price_gel_vat_included: ${retail.error}`);
  const status = parseStatus(get(raw, m.status));
  if (status.error) errors.push(`status: ${status.error}`);

  let images: string[] | undefined;
  if (m.images) {
    const v = get(raw, m.images);
    if (v) {
      images = splitImages(v);
      if (images.length > 12) errors.push('images: too_many');
      const bad = images.filter((r) => !isAllowedImageRef(r));
      if (bad.length) errors.push(`images: https_only (${bad[0].slice(0, 60)})`);
    }
  }

  let specs: Spec[] | undefined;
  if (m.specifications || mapping.specColumns.length) {
    const fromText = m.specifications ? parseSpecs(get(raw, m.specifications)) : [];
    const fromCols: Spec[] = mapping.specColumns
      .map((col) => ({ col, v: get(raw, col) }))
      .filter((x) => x.v)
      .map(({ col, v }) => {
        const label = col.replace(/^spec[:_ ]\s*/i, '').trim();
        return { key: slugify(label, 40).replace(/-/g, '_'), labelKa: label, value: v.slice(0, 500) };
      });
    const merged = [...fromText, ...fromCols.filter((c) => !fromText.some((t) => t.key === c.key))];
    if (merged.length > LIMITS.specs) errors.push('specifications: too_many');
    if (merged.length || get(raw, m.specifications)) specs = merged;
  }

  const featuredRaw = get(raw, m.featured).toLowerCase();
  const sortRaw = get(raw, m.sort_order);
  if (sortRaw && !/^-?\d{1,6}$/.test(sortRaw)) errors.push('sort_order: invalid_number');
  for (const v of Object.values(raw)) if (String(v).length > LIMITS.maxCell) { errors.push('cell: too_long'); break; }

  if (errors.length) return { errors };
  return {
    errors,
    row: {
      sku, category, nameKa,
      categoryNameKa: get(raw, m.category_name_ka) || undefined,
      categoryNameEn: get(raw, m.category_name_en) || undefined,
      descriptionKa: m.description_ka ? get(raw, m.description_ka) : undefined,
      nameEn: get(raw, m.name_en) || undefined,
      descriptionEn: get(raw, m.description_en) || undefined,
      price: price.value,
      retailPrice: retail.value,
      status: status.value,
      color: m.color ? get(raw, m.color) || undefined : undefined,
      modelNumber: m.model_number ? get(raw, m.model_number) || undefined : undefined,
      images,
      specs,
      featured: featuredRaw ? ['yes', 'y', '1', 'true', 'კი'].includes(featuredRaw) : undefined,
      sortOrder: sortRaw ? Number(sortRaw) : undefined,
    },
  };
}

/** Snapshot of an existing product as the import sees it (admin-only; includes price). */
export type ExistingSnapshot = {
  id: string;
  sku: string;
  categorySlug: string;
  nameKa: string;
  descriptionKa: string | null;
  nameEn: string | null;
  descriptionEn: string | null;
  price: string | null;
  retailPrice: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  isHidden: boolean;
  /** hidden by a previous full-catalog import (vs. manually by an admin) */
  hiddenByImport: boolean;
  color: string | null;
  modelNumber: string | null;
  imageRefs: string[];
  specs: Spec[];
  featured: boolean;
  sortOrder: number;
};

export type Diff = Record<string, [unknown, unknown]>;

export function diffRow(ex: ExistingSnapshot, r: NormalizedRow, resolvedCategorySlug: string): Diff {
  const d: Diff = {};
  const cmp = (field: string, oldV: unknown, newV: unknown) => {
    if (newV === undefined) return;
    const n = (v: unknown) => (v === '' || v === undefined ? null : v); // empty cell ≡ no value
    if (JSON.stringify(n(oldV)) !== JSON.stringify(n(newV))) d[field] = [n(oldV), n(newV)];
  };
  cmp('category', ex.categorySlug, resolvedCategorySlug);
  cmp('name_ka', ex.nameKa, r.nameKa);
  cmp('description_ka', ex.descriptionKa, r.descriptionKa);
  cmp('name_en', ex.nameEn, r.nameEn);
  cmp('description_en', ex.descriptionEn, r.descriptionEn);
  cmp('price', ex.price, r.price);
  cmp('retail_price', ex.retailPrice, r.retailPrice);
  cmp('status', ex.status, r.status);
  cmp('color', ex.color, r.color);
  cmp('model_number', ex.modelNumber, r.modelNumber);
  cmp('images', ex.imageRefs, r.images);
  cmp('specifications', ex.specs.map((s) => `${s.labelKa}: ${s.value}`), r.specs?.map((s) => `${s.labelKa}: ${s.value}`));
  cmp('featured', ex.featured, r.featured);
  cmp('sort_order', ex.sortOrder, r.sortOrder);
  // Present again in an import → un-hide, but ONLY if a previous full import hid it. Manual hides stay.
  if (ex.isHidden && ex.hiddenByImport) d.hidden = [true, false];
  return d;
}

export type PlannedRow = { rowNum: number; sku: string | null; action: 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'INVALID'; errors: string[]; diff?: Diff; row?: NormalizedRow; categorySlug?: string; newCategory?: boolean };
export type Plan = {
  rows: PlannedRow[];
  hide: { id: string; sku: string }[];
  totals: { total: number; create: number; update: number; unchanged: number; invalid: number; hide: number; newCategories: string[]; planHash?: string };
};

/** Stable fingerprint of exactly what a commit would do (actions, diffs, hidden SKUs). */
export function planFingerprint(plan: Plan): string {
  return JSON.stringify({ r: plan.rows.map((r) => [r.sku, r.action, r.diff ?? null, r.categorySlug ?? null]), h: plan.hide.map((h) => h.sku).sort() });
}

export type CategoryRef = { slug: string; names: string[] };

export function resolveCategory(value: string, cats: CategoryRef[]): { slug: string; isNew: boolean } {
  const v = value.trim().toLowerCase();
  const hit = cats.find((c) => c.slug === v || c.names.some((n) => n.toLowerCase() === v));
  return hit ? { slug: hit.slug, isNew: false } : { slug: slugify(value, 60), isNew: true };
}

export function buildPlan(rawRows: RawRow[], mapping: Mapping, existing: ExistingSnapshot[], cats: CategoryRef[], mode: 'PARTIAL' | 'FULL_CATALOG', headerRowOffset = 2): Plan {
  const bySku = new Map(existing.map((e) => [e.sku.toLowerCase(), e]));
  const skuCount = new Map<string, number>();
  for (const raw of rawRows) {
    const s = (mapping.fields.sku ? raw[mapping.fields.sku] ?? '' : '').toString().trim().toLowerCase();
    if (s) skuCount.set(s, (skuCount.get(s) ?? 0) + 1);
  }
  const newCats = new Set<string>();
  const rows: PlannedRow[] = rawRows.map((raw, i) => {
    const rowNum = i + headerRowOffset;
    const { row, errors } = normalizeRow(raw, mapping);
    const skuRaw = (mapping.fields.sku ? raw[mapping.fields.sku] ?? '' : '').toString().trim();
    if (skuRaw && (skuCount.get(skuRaw.toLowerCase()) ?? 0) > 1) errors.push('sku: duplicate_in_file');
    if (!row || errors.length) return { rowNum, sku: skuRaw || null, action: 'INVALID', errors };
    const cat = resolveCategory(row.category, cats);
    if (cat.isNew) newCats.add(cat.slug);
    const ex = bySku.get(row.sku.toLowerCase());
    if (!ex) return { rowNum, sku: row.sku, action: 'CREATE', errors: [], row, categorySlug: cat.slug, newCategory: cat.isNew };
    const diff = diffRow(ex, row, cat.slug);
    return { rowNum, sku: ex.sku, action: Object.keys(diff).length ? 'UPDATE' : 'UNCHANGED', errors: [], diff, row, categorySlug: cat.slug, newCategory: cat.isNew };
  });
  // Authoritative full-catalog import only: SKUs absent from the file get hidden (never deleted).
  // If the file has ANY invalid rows we still compute the list but commit is blocked (see service).
  const present = new Set(rows.map((r) => r.sku?.toLowerCase()).filter(Boolean) as string[]);
  const hide = mode === 'FULL_CATALOG' ? existing.filter((e) => !e.isHidden && !present.has(e.sku.toLowerCase())).map((e) => ({ id: e.id, sku: e.sku })) : [];
  const count = (a: PlannedRow['action']) => rows.filter((r) => r.action === a).length;
  return {
    rows,
    hide,
    totals: { total: rows.length, create: count('CREATE'), update: count('UPDATE'), unchanged: count('UNCHANGED'), invalid: count('INVALID'), hide: hide.length, newCategories: [...newCats] },
  };
}

/** Spreadsheet formula-injection guard for exports (CSV/XLSX). */
export function escapeCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
