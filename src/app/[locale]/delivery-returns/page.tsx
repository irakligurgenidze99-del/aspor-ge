import { setRequestLocale } from 'next-intl/server';
import { CmsPage, cmsMetadata } from '@/server/cms-page';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/delivery-returns'>) {
  const { locale } = await params;
  return cmsMetadata('delivery', '/delivery-returns', locale as Locale);
}

export default async function Page({ params }: PageProps<'/[locale]/delivery-returns'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CmsPage pageKey="delivery" locale={locale as Locale} />;
}
