import { vi } from 'vitest';

/** In-memory cookie jar standing in for next/headers in integration tests. */
export const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string, o?: { maxAge?: number }) => (o?.maxAge === 0 || v === '' ? jar.delete(n) : jar.set(n, v)),
    delete: (n: string) => jar.delete(n),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7', 'user-agent': 'vitest' }),
}));
vi.mock('next/navigation', () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); }, notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

export async function resetDb() {
  const { db } = await import('@/lib/db');
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(',')} RESTART IDENTITY CASCADE`);
}

export async function makeCategory(slug = 'chargers') {
  const { db } = await import('@/lib/db');
  return db.category.create({ data: { slug, translations: { create: [{ locale: 'ka', name: slug }] } } });
}

export async function makeProduct(sku: string, categoryId: string, o: { price?: string; status?: 'DRAFT' | 'PUBLISHED'; en?: 'APPROVED' | 'DRAFT_REVIEW' } = {}) {
  const { db } = await import('@/lib/db');
  return db.product.create({
    data: {
      sku, slug: sku.toLowerCase(), categoryId, status: o.status ?? 'PUBLISHED',
      translations: { create: [{ locale: 'ka', name: `პროდუქტი ${sku}` }, ...(o.en ? [{ locale: 'en', name: `Product ${sku}`, status: o.en }] : [])] },
      ...(o.price ? { price: { create: { amountGel: o.price } } } : {}),
    },
  });
}

export function lastEmail(to: string) {
  return import('@/lib/db').then(({ db }) => db.emailLog.findFirst({ where: { to }, orderBy: { createdAt: 'desc' } }));
}
