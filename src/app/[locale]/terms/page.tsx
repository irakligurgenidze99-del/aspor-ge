import { setRequestLocale } from 'next-intl/server';
import { CmsPage, cmsMetadata } from '@/server/cms-page';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/terms'>) {
  const { locale } = await params;
  return cmsMetadata('terms', '/terms', locale as Locale);
}

export default async function Page({ params }: PageProps<'/[locale]/terms'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CmsPage pageKey="terms" locale={locale as Locale} />;
}
