export function formatGel(amount: number | string, locale: 'ka' | 'en' = 'ka'): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: Date | string, locale: 'ka' | 'en' = 'ka'): string {
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tbilisi' }).format(new Date(d));
}
