import 'server-only';

export type ProviderName = 'bog' | 'mock';

/**
 * Which payment provider is active.
 *  - PAYMENTS_PROVIDER=off  → online payment disabled
 *  - PAYMENTS_PROVIDER=mock → simulated payment page (never on the live production deployment)
 *  - PAYMENTS_PROVIDER=bog or unset → Bank of Georgia when BOG_CLIENT_ID + BOG_CLIENT_SECRET exist
 * Unset in local development without BOG keys → mock, so the flow can be tried end-to-end.
 */
export function paymentsProvider(): ProviderName | null {
  const want = (process.env.PAYMENTS_PROVIDER ?? '').trim().toLowerCase();
  const hasBog = !!(process.env.BOG_CLIENT_ID?.trim() && process.env.BOG_CLIENT_SECRET?.trim());
  const liveProd = process.env.VERCEL_ENV === 'production';
  if (want === 'off') return null;
  if (want === 'mock') return liveProd ? null : 'mock';
  if (hasBog) return 'bog';
  if (!want && process.env.NODE_ENV === 'development') return 'mock';
  return null;
}

/** Installment can be switched off separately (it must be activated for the merchant by the bank). */
export const installmentEnabled = () => process.env.SHOP_INSTALLMENT !== 'off';

/** Optional minimum order total for installment (BOG's own limits still apply). */
export const installmentMinGel = () => {
  const n = Number(process.env.BOG_LOAN_MIN_GEL ?? '');
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** The BOG client_id is public (it is part of the SDK script URL). */
export const bogPublicClientId = () => (paymentsProvider() === 'bog' ? process.env.BOG_CLIENT_ID!.trim() : '');
