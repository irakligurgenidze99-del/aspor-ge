// Pure mapping from BOG `order_status.key` to our order status (unit-tested).
export type OrderStatusT = 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'FULFILLED' | 'REFUNDED';

export function mapProviderStatus(key: string): 'PAID' | 'FAILED' | 'REFUNDED' | null {
  switch (key) {
    case 'completed':
      return 'PAID';
    case 'rejected':
      return 'FAILED';
    case 'refunded':
      return 'REFUNDED';
    default:
      return null; // created, processing, auth_requested, blocked, refund_requested, refunded_partially, partial_completed → no automatic change
  }
}

/** Allowed automatic transitions. Manual admin states (FULFILLED, CANCELLED) are never overwritten except by a refund. */
export function nextStatus(current: OrderStatusT, target: 'PAID' | 'FAILED' | 'REFUNDED'): OrderStatusT | null {
  if (current === target) return null;
  if (target === 'PAID') return current === 'PENDING_PAYMENT' || current === 'FAILED' ? 'PAID' : null;
  if (target === 'FAILED') return current === 'PENDING_PAYMENT' ? 'FAILED' : null;
  if (target === 'REFUNDED') return current === 'PAID' || current === 'FULFILLED' || current === 'CANCELLED' ? 'REFUNDED' : null;
  return null;
}

/** Amount check: BOG reports strings like "12.5" — compare in tetri. */
export const sameAmount = (a: string | number | null | undefined, b: string | number) =>
  a !== null && a !== undefined && Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
