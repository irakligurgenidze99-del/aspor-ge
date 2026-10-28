'use server';
import { redirect } from 'next/navigation';
import { checkoutSchema, fieldErrors } from '@/lib/validation';
import { clientIpHash } from '../request';
import { rateLimit, RATE_RULES } from '../rate-limit';
import { looksLikeBot } from '../antispam';
import { placeOrder, applyProviderStatus, orderByToken } from '../services/shop';
import { paymentsProvider } from '../payments/config';
import { db } from '@/lib/db';

export type CheckoutState = {
  error?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
  loan?: { token: string; amount: number; clientId: string };
};

const KEYS = ['customerName', 'phone', 'email', 'city', 'address', 'comment', 'method', 'quantity'];

export async function placeOrderAction(_: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(KEYS.map((k) => [k, String(fd.get(k) ?? '').slice(0, 1000)]));
  if (looksLikeBot(fd)) return { error: 'error', values };
  const ip = await clientIpHash();
  if (!(await rateLimit(`checkout:${ip}`, RATE_RULES.checkout))) return { error: 'rate_limited', values };
  const parsed = checkoutSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  const locale = fd.get('locale') === 'en' ? 'en' : 'ka';
  const useLoanSdk = fd.get('sdk') === '1';
  const d = parsed.data;
  let res;
  try {
    res = await placeOrder({ ...d, comment: d.comment || undefined, locale, ipHash: ip }, { useLoanSdk });
  } catch (e) {
    console.error('[checkout]', e);
    return { error: 'error', values };
  }
  if (!res.ok) return { error: `checkout_${res.error}`, values };
  if (res.kind === 'loan') return { loan: { token: res.token, amount: res.amount, clientId: res.clientId }, values };
  redirect(res.url);
}

/** Simulated payment page (PAYMENTS_PROVIDER=mock only — never on live production). */
export async function mockPayAction(fd: FormData) {
  if (paymentsProvider() !== 'mock') throw new Error('mock payments disabled');
  const token = String(fd.get('o') ?? '');
  const o = await orderByToken(token);
  if (!o || o.provider !== 'mock') throw new Error('not found');
  const outcome = fd.get('outcome') === 'success' ? 'completed' : 'rejected';
  const months = Number(fd.get('months') ?? 0);
  if (months > 0) await db.order.update({ where: { id: o.id }, data: { loanMonths: months } });
  await applyProviderStatus(o.id, { status: outcome, method: o.paymentMethod === 'INSTALLMENT' ? 'bog_loan' : 'card', amount: o.totalGel.toFixed(2) });
  redirect(`/${o.locale}/checkout/result?o=${encodeURIComponent(token)}`);
}
