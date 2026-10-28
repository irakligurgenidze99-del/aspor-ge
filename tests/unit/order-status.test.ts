import { describe, expect, it } from 'vitest';
import { mapProviderStatus, nextStatus, sameAmount } from '@/lib/order-status';

describe('order status mapping', () => {
  it('maps BOG statuses', () => {
    expect(mapProviderStatus('completed')).toBe('PAID');
    expect(mapProviderStatus('rejected')).toBe('FAILED');
    expect(mapProviderStatus('refunded')).toBe('REFUNDED');
    for (const k of ['created', 'processing', 'auth_requested', 'blocked', 'refund_requested', 'refunded_partially', 'partial_completed']) expect(mapProviderStatus(k)).toBeNull();
  });
  it('allows only safe automatic transitions', () => {
    expect(nextStatus('PENDING_PAYMENT', 'PAID')).toBe('PAID');
    expect(nextStatus('FAILED', 'PAID')).toBe('PAID'); // late success is not lost
    expect(nextStatus('PAID', 'FAILED')).toBeNull();
    expect(nextStatus('FULFILLED', 'PAID')).toBeNull();
    expect(nextStatus('CANCELLED', 'PAID')).toBeNull();
    expect(nextStatus('PAID', 'PAID')).toBeNull();
    expect(nextStatus('FULFILLED', 'REFUNDED')).toBe('REFUNDED');
    expect(nextStatus('PENDING_PAYMENT', 'REFUNDED')).toBeNull();
  });
  it('compares amounts in tetri', () => {
    expect(sameAmount('12.5', '12.50')).toBe(true);
    expect(sameAmount('12.49', '12.50')).toBe(false);
    expect(sameAmount(null, '1.00')).toBe(false);
  });
});
