import 'server-only';
import { db } from '@/lib/db';
import { getActivePartner } from '../auth/guards';

/**
 * The ONLY module that reads WholesalePrice for display. It re-checks the partner's
 * live status in the DB (via getActivePartner) on every call; a suspended,
 * pending or rejected account — or an old cookie for one — gets nothing.
 * Never import this from a client component; never pass results into metadata,
 * JSON-LD, sitemaps or anything cached/shared.
 */
export async function getPricesForViewer(productIds: string[]): Promise<Map<string, string> | null> {
  const partner = await getActivePartner();
  if (!partner || productIds.length === 0) return null;
  const rows = await db.wholesalePrice.findMany({ where: { productId: { in: productIds } }, select: { productId: true, amountGel: true } });
  return new Map(rows.map((r) => [r.productId, r.amountGel.toFixed(2)]));
}
