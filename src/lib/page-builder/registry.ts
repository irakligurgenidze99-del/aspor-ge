import { z } from 'zod';
import { isSafeHref } from '../urls';

/**
 * Typed registry of approved page-builder sections. No arbitrary HTML/JS:
 * each section has a fixed schema; rich text is sanitised server-side.
 * Localised fields are { ka, en }. English is shown publicly only after the
 * section's translation is APPROVED.
 */

const LBase = z.object({ ka: z.string().max(5000).default(''), en: z.string().max(5000).default('') });
export type LText = z.infer<typeof LBase>;
export const L = LBase.default({ ka: '', en: '' });
const LRich = z.object({ ka: z.string().max(50000).default(''), en: z.string().max(50000).default('') }).default({ ka: '', en: '' });
const href = z.string().max(500).refine((v) => v === '' || isSafeHref(v), 'unsafe_url').default('');
const mediaId = z.string().max(40).default('');

export const SECTION_SCHEMAS = {
  Hero: z.object({ eyebrow: L, heading: L, subheading: L, ctaLabel: L, ctaHref: href, secondaryLabel: L, secondaryHref: href, imageId: mediaId }),
  RichText: z.object({ heading: L, body: LRich }),
  CategoryGrid: z.object({ heading: L, intro: L }),
  FeaturedProducts: z.object({ heading: L, intro: L, limit: z.coerce.number().int().min(2).max(12).default(8) }),
  ImageTextSplit: z.object({ heading: L, body: L, imageId: mediaId, imageSide: z.enum(['left', 'right']).default('right'), ctaLabel: L, ctaHref: href }),
  BrandStory: z.object({
    eyebrow: L, heading: L, body: L,
    stats: z.array(z.object({ value: z.string().max(20).default(''), label: L })).max(4).default([]),
  }),
  CTA: z.object({ heading: L, body: L, buttonLabel: L, buttonHref: href }),
  LogoStrip: z.object({ heading: L, items: z.array(z.object({ name: z.string().max(80).default(''), imageId: mediaId })).max(12).default([]) }),
  FAQ: z.object({ heading: L, items: z.array(z.object({ q: L, a: L })).max(20).default([]) }),
} as const;

export type SectionType = keyof typeof SECTION_SCHEMAS;
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];
export type SectionData<T extends SectionType = SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;

export function isSectionType(t: string): t is SectionType {
  return t in SECTION_SCHEMAS;
}

export function parseSection(type: string, data: unknown) {
  if (!isSectionType(type)) return { success: false as const, error: 'unknown_type' };
  const r = SECTION_SCHEMAS[type].safeParse(data);
  return r.success ? { success: true as const, data: r.data } : { success: false as const, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}

export function emptySection(type: SectionType): SectionData {
  return SECTION_SCHEMAS[type].parse({});
}

// ── Field descriptors for the admin form renderer ──
export type FieldKind = 'text' | 'ltext' | 'ltextarea' | 'lrich' | 'href' | 'media' | 'number' | 'select' | 'list';
export type FieldDef = { name: string; label: string; kind: FieldKind; options?: string[]; item?: FieldDef[]; max?: number; help?: string };

const LBL: Record<string, string> = {
  eyebrow: 'ზედა წარწერა', heading: 'სათაური', subheading: 'ქვესათაური', ctaLabel: 'ღილაკის ტექსტი', ctaHref: 'ღილაკის ბმული',
  secondaryLabel: 'მეორე ღილაკი', secondaryHref: 'მეორე ღილაკის ბმული', imageId: 'სურათი', body: 'ტექსტი', intro: 'შესავალი',
  limit: 'რაოდენობა', imageSide: 'სურათის მხარე', stats: 'ციფრები', value: 'მნიშვნელობა', label: 'წარწერა', buttonLabel: 'ღილაკის ტექსტი',
  buttonHref: 'ღილაკის ბმული', items: 'ელემენტები', name: 'სახელი', q: 'კითხვა', a: 'პასუხი',
};
const f = (name: string, kind: FieldKind, extra: Partial<FieldDef> = {}): FieldDef => ({ name, label: LBL[name] ?? name, kind, ...extra });

export const SECTION_FIELDS: Record<SectionType, { label: string; fields: FieldDef[] }> = {
  Hero: { label: 'Hero (მთავარი ბანერი)', fields: [f('eyebrow', 'ltext'), f('heading', 'ltext'), f('subheading', 'ltextarea'), f('ctaLabel', 'ltext'), f('ctaHref', 'href'), f('secondaryLabel', 'ltext'), f('secondaryHref', 'href'), f('imageId', 'media')] },
  RichText: { label: 'ტექსტური ბლოკი', fields: [f('heading', 'ltext'), f('body', 'lrich', { help: 'დაშვებულია: p, h2, h3, strong, em, ul/ol/li, a, blockquote, table. სკრიპტები და სტილები იშლება.' })] },
  CategoryGrid: { label: 'კატეგორიების ბადე', fields: [f('heading', 'ltext'), f('intro', 'ltextarea')] },
  FeaturedProducts: { label: 'გამორჩეული პროდუქტები', fields: [f('heading', 'ltext'), f('intro', 'ltextarea'), f('limit', 'number')] },
  ImageTextSplit: { label: 'სურათი + ტექსტი', fields: [f('heading', 'ltext'), f('body', 'ltextarea'), f('imageId', 'media'), f('imageSide', 'select', { options: ['left', 'right'] }), f('ctaLabel', 'ltext'), f('ctaHref', 'href')] },
  BrandStory: { label: 'ბრენდის ისტორია', fields: [f('eyebrow', 'ltext'), f('heading', 'ltext'), f('body', 'ltextarea'), f('stats', 'list', { max: 4, item: [f('value', 'text'), f('label', 'ltext')] })] },
  CTA: { label: 'მოწოდება (CTA)', fields: [f('heading', 'ltext'), f('body', 'ltextarea'), f('buttonLabel', 'ltext'), f('buttonHref', 'href')] },
  LogoStrip: { label: 'ლოგოების ზოლი', fields: [f('heading', 'ltext'), f('items', 'list', { max: 12, item: [f('name', 'text'), f('imageId', 'media')] })] },
  FAQ: { label: 'ხშირად დასმული კითხვები', fields: [f('heading', 'ltext'), f('items', 'list', { max: 20, item: [f('q', 'ltext'), f('a', 'ltextarea')] })] },
};

/** Collect localised strings (path → ka) for translation requests. */
export function collectLocalized(data: unknown, prefix = ''): { path: string; ka: string; en: string }[] {
  const out: { path: string; ka: string; en: string }[] = [];
  if (Array.isArray(data)) data.forEach((v, i) => out.push(...collectLocalized(v, `${prefix}${i}.`)));
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.ka === 'string' && typeof o.en === 'string' && Object.keys(o).length === 2) {
      if (o.ka.trim()) out.push({ path: prefix.replace(/\.$/, ''), ka: o.ka, en: o.en });
    } else for (const [k, v] of Object.entries(o)) out.push(...collectLocalized(v, `${prefix}${k}.`));
  }
  return out;
}

export function setAtPath(data: unknown, path: string, en: string): void {
  const parts = path.split('.');
  let cur = data as Record<string, unknown>;
  for (const p of parts) cur = cur[p] as Record<string, unknown>;
  if (cur && typeof cur === 'object') cur.en = en;
}
