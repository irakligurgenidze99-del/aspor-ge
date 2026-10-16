import { getLocale, getTranslations } from 'next-intl/server';
import { formatGel } from '@/lib/format';
import { Link } from '@/i18n/navigation';

/** Server component. Receives a price only when pricing.ts authorised the viewer. */
export async function PriceTag({ amount, size = 'sm' }: { amount: string | null | undefined; size?: 'sm' | 'lg' }) {
  const t = await getTranslations('product');
  const locale = (await getLocale()) as 'ka' | 'en';
  if (amount === undefined) return null;
  if (amount === null) return <p className="text-sm text-mute">{t('priceOnRequest')}</p>;
  return (
    <p className={size === 'lg' ? 'flex items-baseline gap-2' : 'flex items-baseline gap-1.5'} data-testid="wholesale-price">
      <span className={size === 'lg' ? 'text-2xl font-bold tabular-nums' : 'text-base font-bold tabular-nums'}>{formatGel(amount, locale)}</span>
      <span className="text-xs text-mute">{t('vatIncluded')}</span>
    </p>
  );
}

export async function PartnerPriceCta() {
  const t = await getTranslations('product');
  return (
    <div className="border-l-4 border-spark bg-studio px-4 py-3 text-sm">
      <p className="text-graphite">{t('partnerPriceCta')}</p>
      <p className="mt-2 flex gap-4 font-semibold">
        <Link href="/account/login" className="underline underline-offset-4">{t('partnerPriceLogin')}</Link>
        <Link href="/partners/apply" className="underline underline-offset-4">{t('partnerPriceApply')}</Link>
      </p>
    </div>
  );
}
