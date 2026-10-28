/** Deterministic GEL formatting (same output on server and in every browser): "1 234,50 ₾" / "₾1,234.50". */
export function formatGel(amount: number | string, locale: 'ka' | 'en' = 'ka'): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const sign = n < 0 ? '-' : '';
  if (locale === 'en') return `${sign}₾${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
  return `${sign}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} ₾`;
}
export function formatDate(d: Date | string, locale: 'ka' | 'en' = 'ka'): string {
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tbilisi' }).format(new Date(d));
}
