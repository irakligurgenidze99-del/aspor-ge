import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { clientIpHash } from '@/server/request';
import { rateLimit, RATE_RULES } from '@/server/rate-limit';
import { paymentsProvider } from '@/server/payments/config';
import { startPayment } from '@/server/services/shop';

export const dynamic = 'force-dynamic';

const body = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
  month: z.coerce.number().int().min(1).max(60).optional(),
  discount_code: z.string().max(60).optional(),
});

/**
 * Called by the BOG installment calculator (onRequest) after the buyer picks a term.
 * Creates the BOG order for an already-created PENDING installment order.
 * Returns { orderId } for the SDK, or { redirectUrl } when no term was given.
 */
export async function POST(req: Request) {
  const ip = await clientIpHash();
  if (!(await rateLimit(`loan:${ip}`, RATE_RULES.loan))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const provider = paymentsProvider();
  if (!provider) return NextResponse.json({ error: 'payments_off' }, { status: 503 });
  const o = await db.order.findUnique({ where: { publicToken: parsed.data.token }, select: { id: true, status: true, paymentMethod: true, providerOrderId: true } });
  if (!o || o.paymentMethod !== 'INSTALLMENT' || o.status !== 'PENDING_PAYMENT' || o.providerOrderId) return NextResponse.json({ error: 'invalid_order' }, { status: 409 });
  const { month, discount_code } = parsed.data;
  try {
    const url = await startPayment(o.id, provider, month ? { month, type: discount_code ?? '' } : undefined);
    const fresh = await db.order.findUniqueOrThrow({ where: { id: o.id }, select: { providerOrderId: true } });
    return NextResponse.json({ orderId: fresh.providerOrderId, redirectUrl: url });
  } catch (e) {
    console.error('[loan] start failed', e);
    return NextResponse.json({ error: 'provider_error' }, { status: 502 });
  }
}
