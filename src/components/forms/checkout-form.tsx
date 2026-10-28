'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { placeOrderAction, type CheckoutState } from '@/server/actions/shop';
import { Link } from '@/i18n/navigation';
import { formatGel } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Checkbox, Notice, TextArea, TextField } from '../ui/field';
import { Button } from '../ui/button';
import { useMsg } from './use-msg';

type BogCalc = {
  open: (o: {
    amount: number;
    onClose?: () => void;
    onRequest?: (selected: { amount: number; month: number; discount_code: string }, successCb: (orderId: string) => void, closeCb: () => void) => unknown;
    onComplete?: (r: { redirectUrl?: string }) => unknown;
  }) => void;
};
declare global {
  interface Window { BOG?: { Calculator?: BogCalc } }
}

const CITIES = ['თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი', 'გორი', 'ზუგდიდი', 'ფოთი', 'თელავი', 'ხაშური', 'სამტრედია', 'ზესტაფონი', 'მარნეული', 'ახალციხე', 'ოზურგეთი', 'კასპი', 'ჭიათურა', 'საგარეჯო', 'გარდაბანი', 'ბორჯომი', 'მცხეთა'];

function loadSdk(clientId: string): Promise<BogCalc | null> {
  if (window.BOG?.Calculator) return Promise.resolve(window.BOG.Calculator);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = `https://webstatic.bog.ge/bog-sdk/bog-sdk.js?version=2&client_id=${encodeURIComponent(clientId)}`;
    s.async = true;
    s.onload = () => resolve(window.BOG?.Calculator ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
    setTimeout(() => resolve(window.BOG?.Calculator ?? null), 10_000);
  });
}

export function CheckoutForm(props: {
  ticket: string; slug: string; unitGel: string; initialQty: number; maxQty: number; initialMethod: 'CARD' | 'INSTALLMENT';
  installmentOn: boolean; bogClientId: string; defaults: { customerName: string; phone: string; email: string; address: string };
}) {
  const t = useTranslations('shop');
  const locale = useLocale() as 'ka' | 'en';
  const m = useMsg();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});
  const [qty, setQty] = useState(props.initialQty);
  const [method, setMethod] = useState<'CARD' | 'INSTALLMENT'>(props.initialMethod);
  const [loanMsg, setLoanMsg] = useState<string | null>(null);
  const started = useRef<string | null>(null);
  const v = state.values ?? {};
  const f = state.fields ?? {};
  const total = (Math.round(Number(props.unitGel) * qty * 100) / 100).toFixed(2);
  const resultUrl = (token: string) => `/${locale}/checkout/result?o=${encodeURIComponent(token)}`;

  // Installment via the BOG calculator: the order exists (PENDING); the buyer picks the term in the bank's modal.
  useEffect(() => {
    const loan = state.loan;
    if (!loan || started.current === loan.token) return;
    started.current = loan.token;
    setLoanMsg(t('loanOpening'));
    const startLoan = (body: object) =>
      fetch('/api/checkout/loan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: loan.token, ...body }) }).then((r) => r.json() as Promise<{ orderId?: string; redirectUrl?: string }>);
    loadSdk(loan.clientId).then((calc) => {
      if (!calc) {
        // SDK unavailable → let the bank's page handle the installment choice.
        startLoan({}).then((d) => (d.redirectUrl ? (window.location.href = d.redirectUrl) : setLoanMsg(m('checkout_provider_error') ?? null)));
        return;
      }
      calc.open({
        amount: loan.amount,
        onClose: () => setLoanMsg(t('loanClosed')),
        onRequest: (sel, ok, close) => {
          startLoan({ month: sel.month, discount_code: sel.discount_code })
            .then((d) => (d.orderId ? ok(d.orderId) : close()))
            .catch(() => close());
        },
        onComplete: () => {
          window.location.href = resultUrl(loan.token);
          return false;
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loan]);

  const radio = (value: 'CARD' | 'INSTALLMENT', title: string, hint: string) => (
    <label className={cn('flex cursor-pointer gap-3 rounded-[3px] border p-4', method === value ? 'border-ink bg-studio' : 'border-line')}>
      <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1 size-4 accent-ink" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-graphite">{hint}</span>
      </span>
    </label>
  );

  return (
    <form action={action} className="space-y-8" noValidate data-testid="checkout-form">
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      {loanMsg && <Notice tone="info">{loanMsg}</Notice>}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ft" value={props.ticket} />
      <input type="hidden" name="slug" value={props.slug} />
      <input type="hidden" name="sdk" value={props.bogClientId ? '1' : '0'} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>

      <section className="space-y-5">
        <h2 className="text-lg font-bold">{t('contact')}</h2>
        <TextField label={t('name')} name="customerName" required defaultValue={v.customerName ?? props.defaults.customerName} error={m(f.customerName)} autoComplete="name" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label={t('phone')} name="phone" type="tel" required defaultValue={v.phone ?? props.defaults.phone} error={m(f.phone)} autoComplete="tel" />
          <TextField label={t('email')} name="email" type="email" required defaultValue={v.email ?? props.defaults.email} error={m(f.email)} autoComplete="email" />
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
          <TextField label={t('city')} name="city" required list="ge-cities" defaultValue={v.city} error={m(f.city)} autoComplete="address-level2" />
          <TextField label={t('address')} name="address" required defaultValue={v.address ?? props.defaults.address} error={m(f.address)} autoComplete="street-address" />
        </div>
        <datalist id="ge-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        <TextArea label={t('comment')} name="comment" rows={3} defaultValue={v.comment} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t('payment')}</h2>
        {radio('CARD', t('payCard'), t('payCardHint'))}
        {props.installmentOn && radio('INSTALLMENT', t('payInstallment'), t('payInstallmentHint'))}
      </section>

      <section className="space-y-4 border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label htmlFor="quantity" className="mb-1.5 block text-sm font-semibold">{t('quantity')}</label>
            <input id="quantity" name="quantity" type="number" min={1} max={props.maxQty} value={qty} inputMode="numeric"
              onChange={(e) => setQty(Math.min(props.maxQty, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
              aria-invalid={!!f.quantity} className="h-11 w-24 rounded-[3px] border border-line px-3 tabular-nums focus-visible:border-ink" />
          </div>
          <dl className="min-w-56 space-y-1 text-sm">
            <div className="flex justify-between gap-6"><dt className="text-graphite">{t('delivery')}</dt><dd className="font-semibold">{t('free')}</dd></div>
            <div className="flex justify-between gap-6 text-lg"><dt className="font-bold">{t('total')}</dt><dd className="font-extrabold tabular-nums" data-testid="checkout-total">{formatGel(total, locale)}</dd></div>
          </dl>
        </div>
        <Checkbox
          name="consent"
          error={m(f.consent)}
          label={t.rich('consent', {
            terms: (c) => <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-4">{c}</Link>,
            privacy: (c) => <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-4">{c}</Link>,
          })}
        />
        <Button type="submit" size="lg" variant={method === 'INSTALLMENT' ? 'spark' : 'primary'} disabled={pending} className="w-full sm:w-auto">
          {pending ? t('submitting') : method === 'INSTALLMENT' ? t('submitInstallment') : t('submitCard')}
        </Button>
      </section>
    </form>
  );
}
