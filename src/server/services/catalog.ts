import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';

/**
 * PUBLIC catalog data. Every query here uses an explicit `select` that never
 * touches WholesalePrice. Prices are attached separately by pricing.ts.
 */
export type Locale = 'ka' | 'en';

export const PAGE_SIZE = 24;

const publicWhere: Prisma.ProductWhereInput = { status: 'PUBLISHED', isHidden: false, category: { isActive: true } };

const productCardSelect = {
  id: true,
  sku: true,
  slug: true,
  color: true,
  modelNumber: true,
  retailPrice: true,
  attributes: { where: { key: 'color' }, select: { valueEn: true }, take: 1 },
  category: { select: { slug: true, translations: { select: { locale: true, name: true, status: true } } } },
  translations: { select: { locale: true, name: true, description: true, status: true } },
  images: { select: { altKa: true, altEn: true, asset: { select: { url: true, width: true, height: true, altKa: true, altEn: true } } }, orderBy: { sortOrder: 'asc' }, take: 1 },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export type ProductCardDTO = {
  id: string;
  sku: string;
  slug: string;
  color: string | null;
  name: string;
  categorySlug: string;
  categoryName: string;
  image: { url: string; width: number | null; height: number | null; alt: string } | null;
  /** true when the English request fell back to Georgian (no approved EN translation) */
  fallback: boolean;
  /** PUBLIC retail price (GEL incl. VAT) or null when not sold online. Never the wholesale price. */
  retailGel: string | null;
};

type Tr = { locale: string; status: string; name: string; description?: string | null };

/** English only when an admin APPROVED it; otherwise Georgian. */
export function pickTranslation<T extends Tr>(trs: T[], locale: Locale): { t: T | undefined; fallback: boolean } {
  const ka = trs.find((t) => t.locale === 'ka');
  if (locale === 'en') {
    const en = trs.find((t) => t.locale === 'en' && t.status === 'APPROVED');
    if (en) return { t: en, fallback: false };
    return { t: ka, fallback: true };
  }
  return { t: ka, fallback: false };
}

function toCard(p: CardRow, locale: Locale): ProductCardDTO {
  const { t, fallback } = pickTranslation(p.translations, locale);
  const cat = pickTranslation(p.category.translations, locale).t;
  const img = p.images[0];
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    color: locale === 'en' && !fallback ? p.attributes[0]?.valueEn ?? p.color : p.color,
    name: t?.name ?? p.sku,
    categorySlug: p.category.slug,
    categoryName: cat?.name ?? p.category.slug,
    image: img
      ? { url: img.asset.url, width: img.asset.width, height: img.asset.height, alt: (locale === 'en' ? img.altEn ?? img.asset.altEn : img.altKa ?? img.asset.altKa) ?? t?.name ?? p.sku }
      : null,
    fallback,
    retailGel: p.retailPrice ? p.retailPrice.toFixed(2) : null,
  };
}

export async function listPublicProducts(opts: { locale: Locale; q?: string; category?: string; page?: number; featured?: boolean; limit?: number }) {
  const page = Math.max(1, Math.min(1000, opts.page ?? 1));
  const take = opts.limit ?? PAGE_SIZE;
  const q = opts.q?.trim().slice(0, 100);
  const where: Prisma.ProductWhereInput = {
    ...publicWhere,
    ...(opts.category ? { category: { slug: opts.category, isActive: true } } : {}),
    ...(opts.featured ? { featured: true } : {}),
    ...(q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { modelNumber: { contains: q, mode: 'insensitive' } },
            { translations: { some: { locale: 'ka', name: { contains: q, mode: 'insensitive' } } } },
            { translations: { some: { locale: 'en', status: 'APPROVED', name: { contains: q, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, select: productCardSelect, orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { sku: 'asc' }], skip: (page - 1) * take, take }),
  ]);
  return { total, page, pageCount: Math.max(1, Math.ceil(total / take)), items: rows.map((r) => toCard(r, opts.locale)) };
}

export type ProductDetailDTO = ProductCardDTO & {
  description: string | null;
  modelNumber: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  images: { url: string; width: number | null; height: number | null; alt: string }[];
  specs: { label: string; value: string }[];
  hasApprovedEn: boolean;
  updatedAt: Date;
};

export async function getPublicProduct(slug: string, locale: Locale): Promise<ProductDetailDTO | null> {
  const p = await db.product.findFirst({
    where: { ...publicWhere, slug },
    select: {
      ...productCardSelect,
      updatedAt: true,
      translations: { select: { locale: true, name: true, description: true, status: true, seoTitle: true, seoDesc: true } },
      images: { select: { altKa: true, altEn: true, asset: { select: { url: true, width: true, height: true, altKa: true, altEn: true } } }, orderBy: { sortOrder: 'asc' } },
      attributes: { select: { key: true, labelKa: true, labelEn: true, value: true, valueEn: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!p) return null;
  const card = toCard({ ...p, attributes: p.attributes.filter((a) => a.key === 'color') }, locale);
  const { t, fallback } = pickTranslation(p.translations, locale);
  const useEn = locale === 'en' && !fallback;
  return {
    ...card,
    description: t?.description ?? null,
    modelNumber: p.modelNumber,
    seoTitle: t?.seoTitle ?? null,
    seoDesc: t?.seoDesc ?? null,
    images: p.images.map((i) => ({ url: i.asset.url, width: i.asset.width, height: i.asset.height, alt: (useEn ? i.altEn ?? i.asset.altEn : i.altKa ?? i.asset.altKa) ?? card.name })),
    specs: p.attributes.map((a) => ({ label: (useEn ? a.labelEn : null) ?? a.labelKa, value: (useEn ? a.valueEn : null) ?? a.value })),
    hasApprovedEn: p.translations.some((x) => x.locale === 'en' && x.status === 'APPROVED'),
    updatedAt: p.updatedAt,
  };
}

export async function listPublicCategories(locale: Locale) {
  const cats = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      translations: { select: { locale: true, name: true, description: true, status: true, seoTitle: true, seoDesc: true } },
      image: { select: { url: true } },
      _count: { select: { products: { where: { status: 'PUBLISHED', isHidden: false } } } },
    },
  });
  return cats.map((c) => {
    const { t, fallback } = pickTranslation(c.translations, locale);
    return { id: c.id, slug: c.slug, name: t?.name ?? c.slug, description: t?.description ?? null, seoTitle: t?.seoTitle ?? null, seoDesc: t?.seoDesc ?? null, imageUrl: c.image?.url ?? null, count: c._count.products, fallback };
  });
}

export async function relatedProducts(categorySlug: string, excludeId: string, locale: Locale) {
  const rows = await db.product.findMany({
    where: { ...publicWhere, category: { slug: categorySlug, isActive: true }, id: { not: excludeId } },
    select: productCardSelect,
    take: 4,
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
  });
  return rows.map((r) => toCard(r, locale));
}

/** For sitemap: only public, indexable entries. */
export async function sitemapProducts() {
  return db.product.findMany({
    where: publicWhere,
    select: { slug: true, updatedAt: true, translations: { where: { locale: 'en', status: 'APPROVED' }, select: { locale: true } } },
  });
}
