import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { Notice } from '@/components/ui/field';
import { CheckoutForm } from '@/components/forms/checkout-form';
import { formTicket } from '@/server/antispam';
import { quoteProduct, MAX_QTY } from '@/server/services/shop';
import { paymentsProvider, installmentEnabled, bogPublicClientId } from '@/server/payments/config';
import { getPartnerAccount } from '@/server/auth/guards';
import { buildMetadata } from '@/lib/seo';
import { formatGel } from '@/lib/format';
import type { Locale } from '@/server/services/catalog';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/[locale]/checkout'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shop' });
  return buildMetadata({ title: t('checkoutTitle'), path: '/checkout', locale: locale as Locale, noindex: true });
}

export default async function CheckoutPage({ params, searchParams }: PageProps<'/[locale]/checkout'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const sp = await searchParams;
  const slug = typeof sp.p === 'string' ? sp.p : '';
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const q = await quoteProduct(slug, L);
  if (!q) notFound();
  const t = await getTranslations('shop');
  const max = MAX_QTY[q.priceType];
  const qty = Math.min(max, Math.max(1, Math.floor(Number(sp.q) || 1)));
  const method = sp.m === 'INSTALLMENT' && installmentEnabled() ? 'INSTALLMENT' : 'CARD';
  const provider = paymentsProvider();
  const account = q.partner ? await getPartnerAccount() : null;

  return (
    <Container className="py-10 md:py-14">
      <h1 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-[2.5rem]">{t('checkoutTitle')}</h1>
      {!q.unitGel ? (
        <div className="mt-8"><Notice tone="warn">{t('notForSale')}</Notice></div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            {!provider && <div className="mb-6"><Notice tone="warn">{t('paymentsOff')}</Notice></div>}
            {q.partner && <div className="mb-6"><Notice tone="info">{t('partnerNote', { company: q.partner.companyName })}</Notice></div>}
            <CheckoutForm
              ticket={formTicket()}
              slug={q.slug}
              unitGel={q.unitGel}
              initialQty={qty}
              maxQty={max}
              initialMethod={method}
              installmentOn={installmentEnabled()}
              bogClientId={bogPublicClientId()}
              paymentsOn={!!provider}
              defaults={{ customerName: account?.partner?.contactName ?? account?.name ?? '', phone: account?.partner?.phone ?? '', email: account?.email ?? '', address: account?.partner?.address ?? '' }}
            />
          </div>
          <aside aria-labelledby="summary-h" className="h-fit border border-line p-6 lg:sticky lg:top-24">
            <h2 id="summary-h" className="text-lg font-bold">{t('summary')}</h2>
            <div className="mt-4 flex gap-4">
              <div className="relative size-20 shrink-0 bg-studio">
                {q.image && <Image src={q.image} alt="" fill sizes="80px" className="object-contain p-2" />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{q.name}</p>
                <p className="mt-1 text-xs text-mute">{q.sku}{q.color ? ` · ${q.color}` : ''}</p>
                <p className="mt-1 text-sm tabular-nums">{formatGel(q.unitGel, L)}{q.priceType === 'WHOLESALE' && <span className="ml-2 rounded-[2px] bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-paper">{t('wholesaleBadge')}</span>}</p>
              </div>
            </div>
            <p className="mt-6 text-xs text-mute">{t('freeDelivery')}</p>
          </aside>
        </div>
      )}
    </Container>
  );
}
