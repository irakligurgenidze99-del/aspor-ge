import { processOutbox } from '@/server/email';
import { safeEqual } from '@/lib/crypto';
import { expireStaleOrders } from '@/server/services/shop';

export const dynamic = 'force-dynamic';

/** Vercel Cron → retries failed transactional emails and closes abandoned checkouts. Protected by CRON_SECRET (Bearer). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response('Unauthorized', { status: 401 });
  const processed = await processOutbox(25);
  const expired = await expireStaleOrders();
  return Response.json({ processed, expired });
}
