import { setRequestLocale } from 'next-intl/server';
import { CmsPage, cmsMetadata } from '@/server/cms-page';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/privacy'>) {
  const { locale } = await params;
  return cmsMetadata('privacy', '/privacy', locale as Locale);
}

export default async function Page({ params }: PageProps<'/[locale]/privacy'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CmsPage pageKey="privacy" locale={locale as Locale} />;
}
