import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { CatalogView } from '@/components/site/catalog-view';
import { buildMetadata } from '@/lib/seo';
import { listPublicCategories, type Locale } from '@/server/services/catalog';

async function findCat(slug: string, locale: Locale) {
  return (await listPublicCategories(locale)).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/categories/[slug]'>) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const c = await findCat(slug, locale as Locale);
  if (!c) return {};
  return buildMetadata({ title: c.seoTitle || c.name, description: c.seoDesc || c.description || undefined, path: `/categories/${slug}`, locale: locale as Locale, enIndexable: !c.fallback, noindex: !!(sp.q || sp.page) });
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/[locale]/categories/[slug]'>) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = await findCat(slug, locale as Locale);
  if (!c) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : undefined;
  const page = Number(typeof sp.page === 'string' ? sp.page : 1) || 1;
  return <CatalogView locale={locale as Locale} q={q} category={slug} page={page} title={c.name} intro={c.description} basePath={`/categories/${slug}`} />;
}
