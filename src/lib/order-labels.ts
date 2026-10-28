export const ORDER_STATUS_KA: Record<string, string> = {
  PENDING_PAYMENT: 'გადახდის მოლოდინში', PAID: 'გადახდილი', FAILED: 'წარუმატებელი', CANCELLED: 'გაუქმებული', FULFILLED: 'შესრულებული', REFUNDED: 'დაბრუნებული',
};
export const ORDER_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'danger' | 'dark'> = {
  PENDING_PAYMENT: 'warn', PAID: 'ok', FAILED: 'danger', CANCELLED: 'neutral', FULFILLED: 'dark', REFUNDED: 'neutral',
};
export const METHOD_KA: Record<string, string> = { CARD: 'ბარათი', INSTALLMENT: 'განვადება' };
