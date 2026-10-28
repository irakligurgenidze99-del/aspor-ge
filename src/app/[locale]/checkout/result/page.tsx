import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/container';
import { buttonClass } from '@/components/ui/button';
import { orderByToken, refreshIfPending } from '@/server/services/shop';
import { buildMetadata } from '@/lib/seo';
import { formatGel } from '@/lib/format';
import type { Locale } from '@/server/services/catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[locale]/checkout/result'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shop' });
  return buildMetadata({ title: t('checkoutTitle'), path: '/checkout/result', locale: locale as Locale, noindex: true });
}

export default async function ResultPage({ params, searchParams }: PageProps<'/[locale]/checkout/result'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const token = String((await searchParams).o ?? '');
  let order = await orderByToken(token);
  if (!order) notFound();
  // The bank's callback may arrive after the redirect: pull the receipt once (throttled).
  if (await refreshIfPending(order)) order = (await orderByToken(token))!;
  const t = await getTranslations('shop');
  const s = order.status;
  const [title, body, tone] =
    s === 'PAID' ? [t('paidTitle'), t('paidBody'), 'ok'] :
    s === 'FAILED' ? [t('failedTitle'), t('failedBody'), 'error'] :
    s === 'CANCELLED' ? [t('cancelledTitle'), '', 'neutral'] :
    s === 'REFUNDED' ? [t('refundedTitle'), '', 'neutral'] :
    s === 'FULFILLED' ? [t('fulfilledTitle'), '', 'ok'] :
    [t('pendingTitle'), t('pendingBody'), 'warn'];
  const item = order.items[0];
  return (
    <Container className="max-w-2xl py-14 md:py-20">
      <p className="text-sm font-semibold text-graphite">{t('resultTitle', { number: order.number })}</p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold tracking-[-0.02em]" data-testid="order-status" data-status={s}>
        <span aria-hidden className={`inline-block size-3 rounded-full ${tone === 'ok' ? 'bg-ok' : tone === 'error' ? 'bg-danger' : tone === 'warn' ? 'bg-spark' : 'bg-mute'}`} />
        {title}
      </h1>
      {body && <p className="mt-4 text-graphite">{body}</p>}
      <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-6 py-3"><dt>{i.name} <span className="text-mute">({i.sku}) × {i.quantity}</span></dt><dd className="tabular-nums">{formatGel(i.lineGel.toFixed(2), L)}</dd></div>
        ))}
        <div className="flex justify-between gap-6 py-3 font-bold"><dt>{t('total')}</dt><dd className="tabular-nums">{formatGel(order.totalGel.toFixed(2), L)}</dd></div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        {s === 'PENDING_PAYMENT' && <a href={`?o=${encodeURIComponent(token)}`} className={buttonClass('primary')}>{t('refresh')}</a>}
        {s === 'FAILED' && item?.product && (
          <Link href={{ pathname: '/checkout', query: { p: item.product.slug, q: item.quantity, m: order.paymentMethod } }} className={buttonClass('primary')} prefetch={false}>
            {t('tryAgain')}
          </Link>
        )}
        <Link href="/products" className={buttonClass('secondary')}>{t('continue')}</Link>
      </div>
    </Container>
  );
}
