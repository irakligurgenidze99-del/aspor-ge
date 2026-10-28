import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCallbackSignature } from '@/server/payments/bog';
import { syncOrder } from '@/server/services/shop';

export const dynamic = 'force-dynamic';

/**
 * BOG payment callback. The body is NOT trusted for the status: we only take the
 * order id from it and re-read the authoritative receipt from the BOG API.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 200_000) return NextResponse.json({ ok: false }, { status: 413 });
  const sig = verifyCallbackSignature(raw, req.headers.get('callback-signature'));
  if (sig === false) {
    console.warn('[bog callback] invalid signature');
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let orderId: string | undefined;
  try {
    const j = JSON.parse(raw) as { body?: { order_id?: string } };
    orderId = j.body?.order_id;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!orderId || orderId.length > 100) return NextResponse.json({ ok: false }, { status: 400 });
  const order = await db.order.findUnique({ where: { providerOrderId: orderId }, select: { id: true } });
  if (!order) return NextResponse.json({ ok: true }); // unknown order: acknowledge, nothing to do
  try {
    await syncOrder(order.id);
  } catch (e) {
    console.error('[bog callback] sync failed', e);
    return NextResponse.json({ ok: false }, { status: 500 }); // let the bank retry
  }
  return NextResponse.json({ ok: true });
}
