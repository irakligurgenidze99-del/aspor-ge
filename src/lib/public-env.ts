// Public (browser-safe) configuration. Only IDs that are meant to be public.
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID || '',
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
};
