import 'server-only';
import { headers } from 'next/headers';
import { hmac } from '@/lib/crypto';

export async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel these headers are set by the edge network (client values are overwritten).
  // Behind another proxy, make sure it overwrites them too, or rate limits can be bypassed.
  const v = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const real = h.get('x-real-ip')?.trim();
  const xff = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return v || real || xff || '0.0.0.0';
}

export async function clientIpHash(): Promise<string> {
  return hmac(await clientIp());
}

export async function userAgent(): Promise<string> {
  return ((await headers()).get('user-agent') ?? '').slice(0, 300);
}
