import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jar, resetDb, makeCategory, makeProduct } from './helpers';
import { db } from '@/lib/db';
import { createSession } from '@/server/auth/session';
import { placeOrder, quoteProduct, applyProviderStatus } from '@/server/services/shop';
import { getPublicProduct } from '@/server/services/catalog';
import { POST as callback } from '@/app/api/payments/bog/callback/route';
import { POST as loanRoute } from '@/app/api/checkout/loan/route';

const buyer = { customerName: 'ნინო ბერიძე', phone: '995555123456', email: 'buyer@example.test', city: 'თბილისი', address: 'ჭავჭავაძის 1' };
const env0 = { ...process.env };

async function product(retail: string | null, wholesale?: string) {
  const c = await makeCategory();
  const p = await makeProduct('A1', c.id, { price: wholesale });
  if (retail) await db.product.update({ where: { id: p.id }, data: { retailPrice: retail } });
  return p;
}

async function activePartner() {
  const u = await db.user.create({ data: { email: 'p@example.test', role: 'PARTNER', status: 'ACTIVE', partner: { create: { companyName: 'შპს მაღაზია', companyCode: '400000009', contactName: 'გიო', phone: '995555000111' } } } });
  await createSession(u.id, 'partner');
  return u;
}

beforeEach(async () => {
  await resetDb();
  jar.clear();
  process.env = { ...env0, PAYMENTS_PROVIDER: 'mock', APP_URL: 'https://shop.test' };
  delete process.env.BOG_CLIENT_ID;
  delete process.env.BOG_CLIENT_SECRET;
  delete process.env.VERCEL_ENV;
});
afterEach(() => {
  process.env = { ...env0 };
  vi.unstubAllGlobals();
});

describe('pricing for checkout', () => {
  it('anonymous buys at retail; wholesale never reaches public DTOs', async () => {
    await product('29.90', '17.35');
    const q = await quoteProduct('a1', 'ka');
    expect(q?.unitGel).toBe('29.90');
    expect(q?.priceType).toBe('RETAIL');
    const dto = await getPublicProduct('a1', 'ka');
    expect(dto?.retailGel).toBe('29.90');
    expect(JSON.stringify(dto)).not.toMatch(/17\.35|amountGel/);
  });

  it('active partner buys at wholesale; order stores server prices only', async () => {
    await product('29.90', '17.35');
    await activePartner();
    const r = await placeOrder({ slug: 'a1', quantity: 10, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false });
    expect(r.ok && r.kind).toBe('redirect');
    const o = await db.order.findFirstOrThrow({ include: { items: true } });
    expect(o.priceType).toBe('WHOLESALE');
    expect(o.totalGel.toFixed(2)).toBe('173.50');
    expect(o.companyName).toBe('შპს მაღაზია');
    expect(o.items[0].unitGel.toFixed(2)).toBe('17.35');
  });

  it('suspended partner falls back to retail', async () => {
    await product('29.90', '17.35');
    const u = await activePartner();
    await db.b2BPartner.update({ where: { userId: u.id }, data: { status: 'SUSPENDED' } });
    expect((await quoteProduct('a1', 'ka'))?.priceType).toBe('RETAIL');
  });

  it('refuses products without a price, bad quantities and disabled payments', async () => {
    await product(null);
    expect(await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false })).toEqual({ ok: false, error: 'not_for_sale' });
    await db.product.updateMany({ data: { retailPrice: '10.00' } });
    expect(await placeOrder({ slug: 'a1', quantity: 21, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false })).toEqual({ ok: false, error: 'qty' });
    process.env.PAYMENTS_PROVIDER = 'off';
    expect(await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false })).toEqual({ ok: false, error: 'payments_off' });
    process.env.PAYMENTS_PROVIDER = 'mock';
    process.env.VERCEL_ENV = 'production';
    expect(await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false })).toEqual({ ok: false, error: 'payments_off' });
    expect(await db.order.count()).toBe(0);
  });
});

describe('payment status', () => {
  it('marks PAID once (emails once) and only when the amount matches', async () => {
    await product('25.00');
    await placeOrder({ slug: 'a1', quantity: 2, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false });
    const o = await db.order.findFirstOrThrow();
    expect(await applyProviderStatus(o.id, { status: 'completed', amount: '49.99' })).toBe('PENDING_PAYMENT');
    expect((await db.order.findUniqueOrThrow({ where: { id: o.id } })).adminNote).toMatch(/არ ემთხვევა/);
    expect(await applyProviderStatus(o.id, { status: 'completed', amount: '50' })).toBe('PAID');
    expect(await applyProviderStatus(o.id, { status: 'completed', amount: '50' })).toBe('PAID');
    expect(await db.emailLog.count({ where: { template: 'order_paid_customer', to: buyer.email } })).toBe(1);
    expect(await applyProviderStatus(o.id, { status: 'rejected' })).toBe('PAID'); // never downgraded
  });
});

describe('Bank of Georgia integration (mocked HTTP)', () => {
  function bogFetch(receiptStatus: { status: string; amount: string; external?: string }) {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('openid-connect/token')) return Response.json({ access_token: 'tok', token_type: 'Bearer', expires_in: 300 });
      if (url.endsWith('/ecommerce/orders')) return Response.json({ id: 'bog-123', _links: { redirect: { href: 'https://payment.bog.ge/?order_id=bog-123' }, details: { href: 'x' } } });
      if (url.includes('/receipt/bog-123')) {
        const ext = receiptStatus.external ?? (await db.order.findFirstOrThrow()).number;
        return Response.json({ order_id: 'bog-123', external_order_id: ext, order_status: { key: receiptStatus.status }, purchase_units: { request_amount: receiptStatus.amount, transfer_amount: receiptStatus.amount }, payment_detail: { transfer_method: { key: 'card' } } });
      }
      return new Response('not found', { status: 404 });
    }));
    return calls;
  }

  beforeEach(() => {
    process.env.PAYMENTS_PROVIDER = 'bog';
    process.env.BOG_CLIENT_ID = 'cid';
    process.env.BOG_CLIENT_SECRET = 'secret';
  });

  it('creates a card order and the callback re-checks the receipt before marking PAID', async () => {
    await product('25.00');
    const calls = bogFetch({ status: 'completed', amount: '25.00' });
    const r = await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: true });
    expect(r).toMatchObject({ ok: true, kind: 'redirect', url: 'https://payment.bog.ge/?order_id=bog-123' });
    const create = calls.find((c) => c.url.endsWith('/ecommerce/orders'))!;
    const body = JSON.parse(String(create.init!.body));
    expect(body.payment_method).toEqual(['card']);
    expect(body.purchase_units.total_amount).toBe(25);
    expect(body.callback_url).toBe('https://shop.test/api/payments/bog/callback');
    // Forged callback payload claims nothing useful — status comes from the receipt.
    const res = await callback(new Request('https://shop.test/api/payments/bog/callback', { method: 'POST', body: JSON.stringify({ event: 'order_payment', body: { order_id: 'bog-123', order_status: { key: 'whatever' } } }) }));
    expect(res.status).toBe(200);
    expect((await db.order.findFirstOrThrow()).status).toBe('PAID');
  });

  it('a callback cannot mark PAID when the bank receipt says rejected', async () => {
    await product('25.00');
    bogFetch({ status: 'rejected', amount: '25.00' });
    await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false });
    await callback(new Request('https://x/cb', { method: 'POST', body: JSON.stringify({ body: { order_id: 'bog-123', order_status: { key: 'completed' } } }) }));
    expect((await db.order.findFirstOrThrow()).status).toBe('FAILED');
  });

  it('rejects receipts that belong to another order', async () => {
    await product('25.00');
    bogFetch({ status: 'completed', amount: '25.00', external: 'AS-OTHER' });
    await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false });
    const res = await callback(new Request('https://x/cb', { method: 'POST', body: JSON.stringify({ body: { order_id: 'bog-123' } }) }));
    expect(res.status).toBe(500);
    expect((await db.order.findFirstOrThrow()).status).toBe('PENDING_PAYMENT');
  });

  it('verifies Callback-Signature when a public key is configured', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.BOG_CALLBACK_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    await product('25.00');
    bogFetch({ status: 'completed', amount: '25.00' });
    await placeOrder({ slug: 'a1', quantity: 1, method: 'CARD', locale: 'ka', ...buyer }, { useLoanSdk: false });
    const raw = JSON.stringify({ body: { order_id: 'bog-123' } });
    expect((await callback(new Request('https://x/cb', { method: 'POST', body: raw, headers: { 'Callback-Signature': 'bad' } }))).status).toBe(401);
    const sig = crypto.sign('sha256', Buffer.from(raw), privateKey).toString('base64');
    expect((await callback(new Request('https://x/cb', { method: 'POST', body: raw, headers: { 'Callback-Signature': sig } }))).status).toBe(200);
    expect((await db.order.findFirstOrThrow()).status).toBe('PAID');
  });

  it('installment via the calculator: order first, then BOG order with config.loan', async () => {
    await product('300.00');
    const calls = bogFetch({ status: 'completed', amount: '300.00' });
    const r = await placeOrder({ slug: 'a1', quantity: 1, method: 'INSTALLMENT', locale: 'ka', ...buyer }, { useLoanSdk: true });
    expect(r).toMatchObject({ ok: true, kind: 'loan', amount: 300, clientId: 'cid' });
    const token = (r as { token: string }).token;
    const res = await loanRoute(new Request('https://x/api/checkout/loan', { method: 'POST', body: JSON.stringify({ token, month: 12, discount_code: 'STD' }) }));
    expect(await res.json()).toMatchObject({ orderId: 'bog-123' });
    const body = JSON.parse(String(calls.find((c) => c.url.endsWith('/ecommerce/orders'))!.init!.body));
    expect(body.payment_method).toEqual(['bog_loan']);
    expect(body.config.loan).toEqual({ type: 'STD', month: 12 });
    // Cannot start the same order twice.
    expect((await loanRoute(new Request('https://x', { method: 'POST', body: JSON.stringify({ token, month: 6 }) }))).status).toBe(409);
    expect((await db.order.findFirstOrThrow()).loanMonths).toBe(12);
  });
});
