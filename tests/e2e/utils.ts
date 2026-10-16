import { expect, type Page, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import { E2E } from './constants';

export { E2E };

/** Unique client IP per test so DB-backed rate limits don't interfere between tests. */
export async function freshIp(context: BrowserContext) {
  await context.setExtraHTTPHeaders({ 'x-real-ip': `198.51.100.${Math.floor(Math.random() * 250) + 1}` });
}

function b32(s: string) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, v = 0; const out: number[] = [];
  for (const c of s) { v = (v << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
let lastStep = 0;
/** TOTP for the current step. Steps are single-use server-side (replay protection), so wait for a fresh one. */
export async function freshTotp(secret = E2E.totpSecret) {
  while (Math.floor(Date.now() / 30000) <= lastStep) await new Promise((r) => setTimeout(r, 500));
  lastStep = Math.floor(Date.now() / 30000);
  return totp(secret);
}
export function totp(secret = E2E.totpSecret) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac('sha1', b32(secret)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1e6).toString().padStart(6, '0');
}

export async function adminLogin(page: Page) {
  await freshIp(page.context());
  await page.goto('/admin/login');
  await page.getByLabel('ელფოსტა').fill(E2E.adminEmail);
  await page.getByLabel('პაროლი').fill(E2E.adminPassword);
  await page.getByRole('button', { name: 'შესვლა' }).click();
  await page.waitForURL('**/admin/mfa');
  await page.getByLabel(/6-ნიშნა/).fill(await freshTotp());
  await page.getByRole('button', { name: 'დადასტურება' }).click();
  await page.waitForURL(/\/admin$/);
}

export function mails(to: string) {
  return fs.readFileSync('.e2e/e2e-mail.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { to: string; subject: string; text: string }).filter((m) => m.to === to);
}

export async function expectNoPrice(body: string) {
  expect(body).not.toContain(E2E.price);
  expect(body).not.toContain(E2E.priceKa);
  expect(body).not.toContain('wholesale-price');
}
