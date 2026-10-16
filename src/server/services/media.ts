import 'server-only';
import sharp from 'sharp';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { db } from '@/lib/db';
import { randomToken } from '@/lib/crypto';
import { slugify } from '@/lib/slug';
import { storage } from '../storage';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel request-body ceiling ≈4.5 MB
const ALLOWED_INPUT = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'heif']);

export class MediaError extends Error {}

/**
 * Validate by decoding the actual bytes (not the declared MIME/extension), then
 * re-encode to WebP: strips metadata/EXIF and neutralises polyglot payloads. SVG is refused.
 */
export async function ingestImage(buf: Buffer, originalName: string, alt?: { ka?: string; en?: string }, folder = 'media') {
  if (buf.length === 0) throw new MediaError('empty_file');
  if (buf.length > 25 * 1024 * 1024) throw new MediaError('file_too_large');
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    meta = await sharp(buf, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new MediaError('not_an_image');
  }
  if (!meta.format || !ALLOWED_INPUT.has(meta.format)) throw new MediaError('unsupported_format');
  const out = await sharp(buf, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });
  const base = slugify(originalName.replace(/\.[a-z0-9]+$/i, ''), 50);
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${base}-${randomToken(6)}.webp`;
  const { url } = await storage().put(key, out.data, 'image/webp');
  return db.mediaAsset.create({
    data: {
      storageKey: key, url, mimeType: 'image/webp', sizeBytes: out.data.length, width: out.info.width, height: out.info.height,
      originalName: originalName.slice(0, 200), altKa: alt?.ka, altEn: alt?.en,
    },
  });
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const l = ip.toLowerCase();
  return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:');
}

/** SSRF-guarded download for import image URLs: https only, public IPs only, no redirects, size & time limits. */
export async function fetchRemoteImage(rawUrl: string): Promise<Buffer> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new MediaError('invalid_url');
  }
  if (u.protocol !== 'https:') throw new MediaError('https_only');
  if (u.username || u.password) throw new MediaError('credentials_in_url');
  if (u.port && u.port !== '443') throw new MediaError('port_not_allowed');
  const addrs = await lookup(u.hostname, { all: true }).catch(() => []);
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new MediaError('host_not_allowed');
  const res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { Accept: 'image/*' } });
  if (res.status !== 200) throw new MediaError(`http_${res.status}`);
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.startsWith('image/') || ct.includes('svg')) throw new MediaError('not_an_image');
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > 8 * 1024 * 1024) throw new MediaError('file_too_large');
  const reader = res.body?.getReader();
  if (!reader) throw new MediaError('empty_file');
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 8 * 1024 * 1024) {
      await reader.cancel();
      throw new MediaError('file_too_large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export const __test = { isPrivateIp };
