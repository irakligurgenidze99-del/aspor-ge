'use client';
import { useTranslations } from 'next-intl';

/** Map server error codes to localized text (common.* then auth.*). */
export function useMsg() {
  const c = useTranslations('common');
  const a = useTranslations('auth');
  return (code?: string) => {
    if (!code) return undefined;
    if (c.has(code as never)) return c(code as never);
    if (a.has(code as never)) return a(code as never);
    return c('error');
  };
}
