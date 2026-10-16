import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogView } from '@/components/site/catalog-view';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params, searchParams }: PageProps<'/[locale]/products'>) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'catalog' });
  // Search/paginated variants are not indexed; canonical is the clean listing.
  return buildMetadata({ title: t('title'), description: t('intro'), path: '/products', locale: locale as Locale, noindex: !!(sp.q || sp.page) });
}

export default async function Products({ params, searchParams }: PageProps<'/[locale]/products'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations('catalog');
  const q = typeof sp.q === 'string' ? sp.q : undefined;
  const page = Number(typeof sp.page === 'string' ? sp.page : 1) || 1;
  return <CatalogView locale={locale as Locale} q={q} page={page} title={t('title')} intro={t('intro')} basePath="/products" />;
}
