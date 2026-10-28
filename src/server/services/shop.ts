import 'server-only';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { randomToken } from '@/lib/crypto';
import { LEGAL_UPDATED } from '@/lib/legal-version';
import { mapProviderStatus, nextStatus, sameAmount, type OrderStatusT } from '@/lib/order-status';
import { getActivePartner } from '../auth/guards';
import { pickTranslation, type Locale } from './catalog';
import { paymentsProvider, installmentMinGel, type ProviderName } from '../payments/config';
import { bogCreateOrder, bogReceipt } from '../payments/bog';
import { sendEmail } from '../email';
import { orderAdminNotify, orderPaidCustomer } from '../email/templates';
import { audit } from '../audit';

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const MAX_QTY = { RETAIL: 20, WHOLESALE: 999 } as const;

/**
 * Server-side price for the current viewer. An ACTIVE partner (re-checked in the DB)
 * buys at the wholesale price when one is set; everyone else at the public retail price.
 * The client never supplies a price.
 */
export async function quoteProduct(slug: string, locale: Locale) {
  const p = await db.product.findFirst({
    where: { slug, status: 'PUBLISHED', isHidden: false, category: { isActive: true } },
    select: {
      id: true, sku: true, slug: true, color: true, retailPrice: true,
      translations: { select: { locale: true, name: true, status: true } },
      images: { select: { asset: { select: { url: true } } }, orderBy: { sortOrder: 'asc' }, take: 1 },
      price: { select: { amountGel: true } },
    },
  });
  if (!p) return null;
  const partner = await getActivePartner();
  const wholesale = partner && p.price ? p.price.amountGel.toFixed(2) : null;
  const retail = p.retailPrice ? p.retailPrice.toFixed(2) : null;
  const unitGel = wholesale ?? retail;
  const priceType = wholesale ? ('WHOLESALE' as const) : ('RETAIL' as const);
  return {
    id: p.id, sku: p.sku, slug: p.slug, color: p.color,
    name: pickTranslation(p.translations, locale).t?.name ?? p.sku,
    image: p.images[0]?.asset.url ?? null,
    unitGel, priceType, partner,
  };
}

export type Quote = NonNullable<Awaited<ReturnType<typeof quoteProduct>>>;

const toMoney = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
export const lineTotal = (unit: string, qty: number) => toMoney(Number(unit) * qty);

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = Array.from(crypto.randomBytes(5), (b) => alphabet[b % alphabet.length]).join('');
  return `AS-${ymd}-${rnd}`;
}

export type CheckoutInput = {
  slug: string; quantity: number; method: 'CARD' | 'INSTALLMENT'; locale: Locale;
  customerName: string; phone: string; email: string; city: string; address: string; comment?: string; ipHash?: string;
};

export type PlaceResult =
  | { ok: true; kind: 'redirect'; url: string; token: string }
  | { ok: true; kind: 'loan'; token: string; amount: number; clientId: string }
  | { ok: false; error: 'payments_off' | 'not_for_sale' | 'qty' | 'loan_min' | 'provider_error' };

/** Creates the order (server prices) and starts payment. */
export async function placeOrder(input: CheckoutInput, opts: { useLoanSdk: boolean }): Promise<PlaceResult> {
  const provider = paymentsProvider();
  if (!provider) return { ok: false, error: 'payments_off' };
  const q = await quoteProduct(input.slug, input.locale);
  if (!q || !q.unitGel) return { ok: false, error: 'not_for_sale' };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QTY[q.priceType]) return { ok: false, error: 'qty' };
  const total = lineTotal(q.unitGel, input.quantity);
  if (input.method === 'INSTALLMENT' && Number(total) < installmentMinGel()) return { ok: false, error: 'loan_min' };

  const partnerRow = q.partner ? await db.b2BPartner.findUnique({ where: { id: q.partner.partnerId }, select: { companyName: true, companyCode: true } }) : null;
  let order = null;
  for (let i = 0; i < 4 && !order; i++) {
    try {
      order = await db.order.create({
        data: {
          number: orderNumber(), publicToken: randomToken(24), paymentMethod: input.method, priceType: q.priceType,
          partnerId: q.partner?.partnerId ?? null, companyName: partnerRow?.companyName ?? null, companyCode: partnerRow?.companyCode ?? null,
          customerName: input.customerName, phone: input.phone, email: input.email, city: input.city, address: input.address, comment: input.comment || null,
          locale: input.locale, subtotalGel: total, deliveryGel: '0.00', totalGel: total, consentAt: new Date(), termsVersion: LEGAL_UPDATED,
          provider, ipHash: input.ipHash ?? null,
          items: { create: { productId: q.id, sku: q.sku, name: q.name, quantity: input.quantity, unitGel: q.unitGel, lineGel: total } },
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code !== 'P2002') throw e; // retry only on order-number collision
    }
  }
  if (!order) throw new Error('could not allocate order number');

  if (input.method === 'INSTALLMENT' && opts.useLoanSdk && provider === 'bog') {
    // The BOG calculator (on the checkout page) lets the buyer choose the term, then calls /api/checkout/loan.
    return { ok: true, kind: 'loan', token: order.publicToken, amount: Number(total), clientId: process.env.BOG_CLIENT_ID!.trim() };
  }
  try {
    const url = await startPayment(order.id, provider);
    return { ok: true, kind: 'redirect', url, token: order.publicToken };
  } catch (e) {
    console.error('[checkout] provider error', e);
    await db.order.update({ where: { id: order.id }, data: { status: 'FAILED', providerStatus: 'create_failed' } });
    return { ok: false, error: 'provider_error' };
  }
}

/** Creates the provider-side order and returns the payment page URL. */
export async function startPayment(orderId: string, provider: ProviderName, loan?: { month: number; type: string }): Promise<string> {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { product: { select: { images: { select: { asset: { select: { url: true } } }, take: 1, orderBy: { sortOrder: 'asc' } } } } } } } });
  if (o.status !== 'PENDING_PAYMENT' || o.providerOrderId) throw new Error('order already started');
  const result = `${appUrl()}/${o.locale}/checkout/result?o=${encodeURIComponent(o.publicToken)}`;
  if (provider === 'mock') {
    const id = `mock_${randomToken(9)}`;
    await db.order.update({ where: { id: o.id }, data: { providerOrderId: id, providerStatus: 'created', loanMonths: loan?.month ?? null } });
    return `${appUrl()}/${o.locale}/checkout/mock-pay?o=${encodeURIComponent(o.publicToken)}`;
  }
  const abs = (u: string) => (u.startsWith('http') ? u : `${appUrl()}${u}`);
  const created = await bogCreateOrder({
    externalId: o.number,
    amount: Number(o.totalGel),
    items: o.items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity, unit: Number(i.unitGel), image: i.product?.images[0]?.asset.url ? abs(i.product.images[0].asset.url) : undefined })),
    method: o.paymentMethod === 'INSTALLMENT' ? 'bog_loan' : 'card',
    loan,
    callbackUrl: `${appUrl()}/api/payments/bog/callback`,
    successUrl: result,
    failUrl: result,
    locale: o.locale === 'en' ? 'en' : 'ka',
    buyer: { fullName: o.customerName, phone: o.phone, email: o.email },
    idempotencyKey: crypto.randomUUID(),
  });
  await db.order.update({ where: { id: o.id }, data: { providerOrderId: created.id, providerStatus: 'created', loanMonths: loan?.month ?? null } });
  return created.redirectUrl;
}

/**
 * Applies a provider status to the order (idempotent). Marks PAID only when the
 * paid amount matches the order total; sends confirmation emails exactly once.
 */
export async function applyProviderStatus(orderId: string, r: { status: string; method?: string | null; amount?: string | null; rejectReason?: string | null }) {
  const target = mapProviderStatus(r.status);
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  let next = target ? nextStatus(o.status as OrderStatusT, target) : null;
  let note: string | undefined;
  if (next === 'PAID' && !sameAmount(r.amount, o.totalGel.toFixed(2))) {
    next = null;
    note = `თანხა არ ემთხვევა: BOG ${r.amount ?? '?'} ₾, შეკვეთა ${o.totalGel.toFixed(2)} ₾ — შეამოწმეთ ხელით.`;
  }
  // Conditional update: only the first writer that sees the old status wins (callback vs. result-page poll).
  const res = await db.order.updateMany({
    where: { id: o.id, status: o.status },
    data: {
      providerStatus: r.status, ...(r.method ? { providerMethod: r.method } : {}),
      ...(next ? { status: next } : {}), ...(next === 'PAID' ? { paidAt: new Date() } : {}),
      ...(note ? { adminNote: [o.adminNote, note].filter(Boolean).join('\n') } : {}),
    },
  });
  if (res.count === 1 && next) {
    await audit(null, 'order.status', 'Order', o.id, { from: o.status, to: next, provider: r.status });
    if (next === 'PAID') await notifyPaid(o.id);
  }
  return next ?? o.status;
}

async function notifyPaid(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const mail = {
    number: o.number, customerName: o.customerName, totalGel: o.totalGel.toFixed(2), method: o.paymentMethod, priceType: o.priceType,
    items: o.items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity, lineGel: i.lineGel.toFixed(2) })),
    phone: o.phone, email: o.email, city: o.city, address: o.address, comment: o.comment, companyName: o.companyName,
  };
  await sendEmail(o.email, 'order_paid_customer', orderPaidCustomer(mail)).catch((e) => console.error('[order email]', e));
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (to) await sendEmail(to, 'order_admin_notify', orderAdminNotify({ ...mail, adminUrl: `${appUrl()}/admin/orders/${o.id}` })).catch((e) => console.error('[order email]', e));
}

/** Pulls the authoritative status from BOG (receipt) and applies it. */
export async function syncOrder(orderId: string) {
  const o = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (o.provider !== 'bog' || !o.providerOrderId) return o.status;
  const r = await bogReceipt(o.providerOrderId);
  if (r.externalId && r.externalId !== o.number) throw new Error('receipt does not belong to this order');
  return applyProviderStatus(o.id, r);
}

/** Result page: re-check a pending BOG order at most every few seconds. */
export async function refreshIfPending(o: { id: string; status: string; provider: string; providerOrderId: string | null; updatedAt: Date }) {
  if (o.status !== 'PENDING_PAYMENT' || o.provider !== 'bog' || !o.providerOrderId || Date.now() - o.updatedAt.getTime() < 3000) return false;
  try {
    await syncOrder(o.id);
    return true;
  } catch (e) {
    console.error('[result] sync failed', e);
    return false;
  }
}

export async function orderByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  return db.order.findUnique({ where: { publicToken: token }, include: { items: { include: { product: { select: { slug: true } } } } } });
}

/**
 * Abandoned checkouts: PENDING for more than 2 days. A BOG order is re-checked first
 * (so a late payment is never lost); anything still unpaid becomes CANCELLED.
 */
export async function expireStaleOrders() {
  const stale = await db.order.findMany({ where: { status: 'PENDING_PAYMENT', createdAt: { lt: new Date(Date.now() - 2 * 24 * 3600 * 1000) } }, select: { id: true }, take: 50 });
  let n = 0;
  for (const o of stale) {
    try {
      if ((await syncOrder(o.id)) !== 'PENDING_PAYMENT') continue;
    } catch (e) {
      console.error('[expire] sync failed', e);
      continue;
    }
    const r = await db.order.updateMany({ where: { id: o.id, status: 'PENDING_PAYMENT' }, data: { status: 'CANCELLED', providerStatus: 'expired' } });
    n += r.count;
  }
  return n;
}
