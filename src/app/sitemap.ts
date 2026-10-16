import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { sitemapProducts } from '@/server/services/catalog';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Only public, published, non-hidden content. English URLs only where approved English exists. Never prices. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL();
  const [pages, cats, products] = await Promise.all([
    db.page.findMany({ where: { publishedAt: { not: null } }, select: { slug: true, updatedAt: true, translations: { where: { locale: 'en', status: 'APPROVED' }, select: { id: true } } } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true, translations: { where: { locale: 'en', status: 'APPROVED' }, select: { id: true } } } }),
    sitemapProducts(),
  ]);
  const entry = (path: string, lastModified: Date | undefined, en: boolean): MetadataRoute.Sitemap => {
    const languages: Record<string, string> = { ka: `${base}/ka${path}` };
    if (en) languages.en = `${base}/en${path}`;
    const out: MetadataRoute.Sitemap = [{ url: `${base}/ka${path}`, lastModified, alternates: { languages } }];
    if (en) out.push({ url: `${base}/en${path}`, lastModified, alternates: { languages } });
    return out;
  };
  return [
    ...pages.flatMap((p) => entry(p.slug ? `/${p.slug}` : '', p.updatedAt, p.translations.length > 0)),
    ...['/products', '/where-to-buy', '/partners/apply', '/contact'].flatMap((p) => entry(p, undefined, true)),
    ...cats.flatMap((c) => entry(`/categories/${c.slug}`, c.updatedAt, c.translations.length > 0)),
    ...products.flatMap((p) => entry(`/products/${p.slug}`, p.updatedAt, p.translations.length > 0)),
  ];
}
