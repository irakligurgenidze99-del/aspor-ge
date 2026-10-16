import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { manrope, georgian } from '../fonts';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { ConsentAndAnalytics } from '@/components/site/consent';
import { publicEnv } from '@/lib/public-env';
import { SITE_URL } from '@/lib/seo';
import '../globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL(SITE_URL()),
    title: { default: t('defaultTitle'), template: '%s | ASPOR' },
    description: t('defaultDescription'),
    ...(process.env.ALLOW_INDEXING === '1' ? {} : { robots: { index: false, follow: false } }),
    ...(publicEnv.googleSiteVerification ? { verification: { google: publicEnv.googleSiteVerification } } : {}),
  };
}

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('nav');
  return (
    <html lang={locale} className={`${manrope.variable} ${georgian.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-spark focus:px-4 focus:py-2 focus:font-semibold">
            {t('skip')}
          </a>
          <Header />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
          <ConsentAndAnalytics ga4Id={publicEnv.ga4Id} pixelId={publicEnv.metaPixelId} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
