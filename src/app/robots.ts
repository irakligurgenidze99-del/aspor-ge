import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  // Indexing is opt-in (ALLOW_INDEXING=1) so a staging/vercel.app deployment with placeholder copy is never indexed.
  const isProdSite = process.env.ALLOW_INDEXING === '1' && (process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : true);
  if (!isProdSite) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/ka/account', '/en/account', '/*?q=', '/*?*page='] }],
    sitemap: `${SITE_URL()}/sitemap.xml`,
    host: SITE_URL(),
  };
}
