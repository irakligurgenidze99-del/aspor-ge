import type { Metadata } from 'next';
import { publicEnv } from './public-env';

export const SITE_URL = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Locale alternates. `enIndexable=false` (no approved English content) → the English
 * URL is excluded from hreflang and marked noindex on its own page.
 */
export function localeAlternates(path: string, locale: 'ka' | 'en', enIndexable = true): Metadata['alternates'] {
  const p = path === '/' ? '' : path;
  const languages: Record<string, string> = { ka: `${SITE_URL()}/ka${p}`, 'x-default': `${SITE_URL()}/ka${p}` };
  if (enIndexable) languages.en = `${SITE_URL()}/en${p}`;
  return { canonical: `${SITE_URL()}/${locale}${p}`, languages };
}

export function buildMetadata(o: { title: string; description?: string; path: string; locale: 'ka' | 'en'; enIndexable?: boolean; image?: string | null; noindex?: boolean; type?: 'website' | 'article' }): Metadata {
  const enIndexable = o.enIndexable ?? true;
  const noindex = o.noindex || (o.locale === 'en' && !enIndexable);
  const image = o.image ? (o.image.startsWith('http') ? o.image : `${SITE_URL()}${o.image}`) : `${SITE_URL()}/brand/og-default.png`;
  return {
    title: o.title,
    description: o.description,
    alternates: localeAlternates(o.path, o.locale, enIndexable),
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: o.type ?? 'website',
      siteName: 'ASPOR',
      title: o.title,
      description: o.description,
      url: `${SITE_URL()}/${o.locale}${o.path === '/' ? '' : o.path}`,
      locale: o.locale === 'ka' ? 'ka_GE' : 'en_GB',
      alternateLocale: o.locale === 'ka' ? ['en_GB'] : ['ka_GE'],
      images: [{ url: image }],
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [image] },
    ...(publicEnv.googleSiteVerification ? { verification: { google: publicEnv.googleSiteVerification } } : {}),
  };
}
