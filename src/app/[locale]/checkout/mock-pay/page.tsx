import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/field';
import { orderByToken } from '@/server/services/shop';
import { paymentsProvider } from '@/server/payments/config';
import { mockPayAction } from '@/server/actions/shop';
import { formatGel } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/** Simulated bank page — only exists when PAYMENTS_PROVIDER=mock (local/preview). */
export default async function MockPay({ params, searchParams }: PageProps<'/[locale]/checkout/mock-pay'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (paymentsProvider() !== 'mock') notFound();
  const token = String((await searchParams).o ?? '');
  const o = await orderByToken(token);
  if (!o || o.provider !== 'mock' || o.status !== 'PENDING_PAYMENT') notFound();
  const t = await getTranslations('shop');
  return (
    <Container className="max-w-lg py-16">
      <Notice tone="warn">{t('mockBody')}</Notice>
      <h1 className="mt-6 text-2xl font-extrabold">{t('mockTitle')}: {o.number}</h1>
      <p className="mt-2 text-lg tabular-nums">{formatGel(o.totalGel.toFixed(2), locale === 'en' ? 'en' : 'ka')} · {o.paymentMethod === 'INSTALLMENT' ? t('payInstallment') : t('payCard')}</p>
      <form action={mockPayAction} className="mt-8 space-y-5">
        <input type="hidden" name="o" value={token} />
        {o.paymentMethod === 'INSTALLMENT' && (
          <label className="block text-sm font-semibold">
            {t('mockMonths')}
            <select name="months" defaultValue="12" className="mt-1.5 block h-11 w-full rounded-[3px] border border-line px-3">
              {[3, 6, 12, 18, 24].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <div className="flex gap-3">
          <Button name="outcome" value="success" data-testid="mock-success">{t('mockSuccess')}</Button>
          <Button name="outcome" value="fail" variant="secondary" data-testid="mock-fail">{t('mockFail')}</Button>
        </div>
      </form>
    </Container>
  );
}
