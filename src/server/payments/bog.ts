import 'server-only';
import crypto from 'node:crypto';

/**
 * Bank of Georgia Payments API (api.bog.ge/docs/en/payments).
 * OAuth2 client-credentials → create order → redirect → callback → receipt.
 * The receipt endpoint is the source of truth; callbacks only trigger a re-check.
 */
const TOKEN_URL = process.env.BOG_TOKEN_URL || 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';
const API = (process.env.BOG_API_URL || 'https://api.bog.ge/payments/v1').replace(/\/$/, '');

let cachedToken: { value: string; exp: number } | null = null;

export class BogError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function token(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.value;
  const basic = Buffer.from(`${process.env.BOG_CLIENT_ID}:${process.env.BOG_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new BogError(`token ${res.status}`, res.status);
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new BogError('token missing');
  // Guard against odd expires_in values: never cache longer than 10 minutes.
  const ttl = Math.min(Number(j.expires_in) > 0 ? Number(j.expires_in) : 300, 600);
  cachedToken = { value: j.access_token, exp: Date.now() + ttl * 1000 };
  return j.access_token;
}

export type BogCreate = {
  externalId: string;
  amount: number;
  items: { sku: string; name: string; quantity: number; unit: number; image?: string }[];
  method: 'card' | 'bog_loan';
  loan?: { month: number; type: string };
  callbackUrl: string;
  successUrl: string;
  failUrl: string;
  locale: 'ka' | 'en';
  buyer?: { fullName: string; phone: string; email: string };
  idempotencyKey: string;
};

export async function bogCreateOrder(o: BogCreate): Promise<{ id: string; redirectUrl: string }> {
  const body = {
    callback_url: o.callbackUrl,
    external_order_id: o.externalId,
    application_type: 'web',
    ttl: o.method === 'bog_loan' ? 60 : 30,
    ...(o.buyer ? { buyer: { full_name: o.buyer.fullName, masked_email: o.buyer.email, masked_phone: o.buyer.phone } } : {}),
    purchase_units: {
      currency: 'GEL',
      total_amount: o.amount,
      basket: o.items.map((i) => ({ product_id: i.sku, description: i.name.slice(0, 120), quantity: i.quantity, unit_price: i.unit, ...(i.image ? { image: i.image } : {}) })),
      delivery: { amount: 0 },
    },
    redirect_urls: { success: o.successUrl, fail: o.failUrl },
    payment_method: [o.method],
    ...(o.method === 'bog_loan' && o.loan ? { config: { loan: { type: o.loan.type, month: o.loan.month } } } : {}),
  };
  const res = await fetch(`${API}/ecommerce/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', 'Accept-Language': o.locale, 'Idempotency-Key': o.idempotencyKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300);
    throw new BogError(`create ${res.status} ${text}`, res.status);
  }
  const j = (await res.json()) as { id?: string; _links?: { redirect?: { href?: string } } };
  if (!j.id || !j._links?.redirect?.href) throw new BogError('create: unexpected response');
  return { id: j.id, redirectUrl: j._links.redirect.href };
}

export type Receipt = { status: string; method: string | null; amount: string | null; rejectReason: string | null; externalId: string | null };

export async function bogReceipt(orderId: string): Promise<Receipt> {
  const res = await fetch(`${API}/receipt/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${await token()}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new BogError(`receipt ${res.status}`, res.status);
  const j = (await res.json()) as {
    order_status?: { key?: string };
    payment_detail?: { transfer_method?: { key?: string } };
    purchase_units?: { request_amount?: string; transfer_amount?: string };
    reject_reason?: string | null;
    external_order_id?: string;
  };
  return {
    status: j.order_status?.key ?? 'unknown',
    method: j.payment_detail?.transfer_method?.key ?? null,
    amount: j.purchase_units?.transfer_amount ?? j.purchase_units?.request_amount ?? null,
    rejectReason: j.reject_reason ?? null,
    externalId: j.external_order_id ?? null,
  };
}

/**
 * Optional: verifies `Callback-Signature` (SHA256withRSA over the raw body) when
 * BOG_CALLBACK_PUBLIC_KEY is configured. The receipt re-check makes this
 * defence-in-depth rather than the only safeguard.
 */
export function verifyCallbackSignature(rawBody: string, signature: string | null): boolean | null {
  const pem = process.env.BOG_CALLBACK_PUBLIC_KEY?.replace(/\\n/g, '\n').trim();
  if (!pem) return null;
  if (!signature) return false;
  try {
    return crypto.verify('sha256', Buffer.from(rawBody), pem, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}
