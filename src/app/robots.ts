import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const isProdSite = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : true;
  if (!isProdSite) return { rules: [{ userAgent: '*', disallow: '/' }] }; // never index preview deployments
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/ka/account', '/en/account', '/*?q=', '/*?*page='] }],
    sitemap: `${SITE_URL()}/sitemap.xml`,
    host: SITE_URL(),
  };
}
