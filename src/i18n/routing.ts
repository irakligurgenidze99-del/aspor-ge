import { defineRouting } from 'next-intl/routing';

export const locales = ['ka', 'en'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'ka',
  localePrefix: 'always',
  // Georgian is the primary market; never auto-redirect search bots by Accept-Language.
  localeDetection: false,
});
