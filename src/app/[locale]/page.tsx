import { setRequestLocale } from 'next-intl/server';
import { CmsPage, cmsMetadata } from '@/server/cms-page';
import { JsonLd } from '@/components/site/json-ld';
import { SITE_URL } from '@/lib/seo';
import { BannerStrip } from '@/components/site/banners';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  return cmsMetadata('home', '/', locale as Locale);
}

export default async function Home({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'ASPOR', url: SITE_URL(), logo: `${SITE_URL()}/brand/aspor-logo.png`, slogan: 'Power your aspiration' }} />
      <CmsPage pageKey="home" locale={locale as Locale} />
      <BannerStrip placement="home" locale={locale as Locale} />
    </>
  );
}
