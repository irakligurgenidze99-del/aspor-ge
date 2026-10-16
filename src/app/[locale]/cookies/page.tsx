import { setRequestLocale } from 'next-intl/server';
import { CmsPage, cmsMetadata } from '@/server/cms-page';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/cookies'>) {
  const { locale } = await params;
  return cmsMetadata('cookies', '/cookies', locale as Locale);
}

export default async function Page({ params }: PageProps<'/[locale]/cookies'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CmsPage pageKey="cookies" locale={locale as Locale} />;
}
