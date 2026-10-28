import { getLocale, getTranslations } from 'next-intl/server';
import { formatGel } from '@/lib/format';
import { Link } from '@/i18n/navigation';
import { buttonClass } from '../ui/button';
import { PartnerPriceCta, PriceTag, RetailPriceTag } from './price';

/**
 * Product-page purchase box. Plain GET form → /checkout (works without JS).
 * `wholesale`: undefined = viewer is not an active partner; null = partner but no wholesale price.
 */
export async function BuyBox({ slug, retail, wholesale, paymentsOn, installmentOn }: { slug: string; retail: string | null; wholesale: string | null | undefined; paymentsOn: boolean; installmentOn: boolean }) {
  const t = await getTranslations('shop');
  const tp = await getTranslations('product');
  const locale = (await getLocale()) as 'ka' | 'en';
  const unit = wholesale ?? retail;
  return (
    <div className="mt-8 border-y border-line py-6">
      {wholesale ? (
        <>
          <p className="mb-1 text-sm text-graphite">{t('yourPrice')}</p>
          <PriceTag amount={wholesale} size="lg" />
          {retail && <p className="mt-1 text-xs text-mute">{t('retail')}: <span className="tabular-nums">{formatGel(retail, locale)}</span></p>}
        </>
      ) : retail ? (
        <RetailPriceTag amount={retail} size="lg" />
      ) : wholesale === undefined ? null : (
        <>
          <p className="mb-1 text-sm text-graphite">{tp('wholesale')}</p>
          <PriceTag amount={null} />
        </>
      )}

      {unit ? (
        paymentsOn ? (
          <form action={`/${locale}/checkout`} method="get" className="mt-5 space-y-4" data-testid="buy-form">
            <input type="hidden" name="p" value={slug} />
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="q" className="mb-1.5 block text-sm font-semibold">{t('quantity')}</label>
                <input id="q" name="q" type="number" min={1} max={wholesale ? 999 : 20} defaultValue={1} inputMode="numeric" className="h-13 w-24 rounded-[3px] border border-line px-3 text-base tabular-nums focus-visible:border-ink" />
              </div>
              <button name="m" value="CARD" className={buttonClass('primary', 'lg')}>{t('buy')}</button>
              {installmentOn && <button name="m" value="INSTALLMENT" className={buttonClass('spark', 'lg')}>{t('buyInstallment')}</button>}
            </div>
            <p className="flex items-center gap-2 text-sm text-graphite"><span aria-hidden className="inline-block size-1.5 rounded-full bg-ok" />{t('freeDelivery')}</p>
          </form>
        ) : (
          <p className="mt-4 text-sm text-graphite">{t('paymentsOff')}</p>
        )
      ) : (
        <p className="mt-2 text-sm text-graphite">
          {t('notForSale')}{' '}
          <Link href="/where-to-buy" className="font-semibold underline underline-offset-4">{t('whereToBuy')}</Link>
        </p>
      )}
      {wholesale === undefined && <div className="mt-5"><PartnerPriceCta /></div>}
    </div>
  );
}
