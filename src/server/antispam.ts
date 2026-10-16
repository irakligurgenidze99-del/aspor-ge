import 'server-only';
import { hmac, safeEqual } from '@/lib/crypto';

/** Issued into forms at render time; verified on submit (min fill time + max age + signature). */
export function formTicket(): string {
  const ts = Date.now().toString();
  return `${ts}.${hmac('form:' + ts)}`;
}

export function looksLikeBot(fd: FormData): boolean {
  if (String(fd.get('website') ?? '').length > 0) return true; // honeypot
  const ticket = String(fd.get('ft') ?? '');
  const [ts, sig] = ticket.split('.');
  if (!ts || !sig || !safeEqual(sig, hmac('form:' + ts))) return true;
  const age = Date.now() - Number(ts);
  const minMs = process.env.NODE_ENV === 'test' || process.env.ANTISPAM_MIN_MS === '0' ? 0 : 2500;
  return age < minMs || age > 3 * 3600 * 1000;
}
