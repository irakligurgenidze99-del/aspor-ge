import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb, makeCategory, makeProduct } from './helpers';
import { db } from '@/lib/db';
import { createImportJob, previewImport, commitImport } from '@/server/import/service';
import { suggestMapping } from '@/lib/import/fields';
import { toXlsx } from '@/server/import/export';

const csv = (rows: string[][]) => Buffer.from(rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n'));
const H = ['sku', 'category', 'name_ka', 'wholesale_price_gel_vat_included', 'status', 'specifications'];
let adminId = '';

beforeEach(async () => {
  await resetDb();
  adminId = (await db.user.create({ data: { email: 'a@x.test', role: 'SUPER_ADMIN', status: 'ACTIVE' } })).id;
  const c = await makeCategory('chargers');
  await makeProduct('OLD-1', c.id, { price: '10.00' });
  await makeProduct('OLD-2', c.id, { price: '11.00' });
});

async function run(buf: Buffer, name: string, mode: 'PARTIAL' | 'FULL_CATALOG') {
  const job = await createImportJob(buf, name, mode, adminId);
  const plan = await previewImport(job.id, suggestMapping(job.headers));
  return { job, plan };
}

describe('import workflow', () => {
  it('preview makes no catalog changes; partial commit creates/updates and never hides', async () => {
    const buf = csv([H, ['NEW-1', 'chargers', 'ახალი', '5', 'published', 'Power: 20W'], ['OLD-1', 'chargers', 'პროდუქტი OLD-1', '12.5', '', '']]);
    const before = await db.product.findMany({ orderBy: { sku: 'asc' }, include: { price: true } });
    const { job, plan } = await run(buf, 'p.csv', 'PARTIAL');
    expect(plan.totals).toMatchObject({ create: 1, update: 1, invalid: 0, hide: 0 });
    const after = await db.product.findMany({ orderBy: { sku: 'asc' }, include: { price: true } });
    expect(JSON.stringify(after)).toBe(JSON.stringify(before)); // dry run → no changes
    await commitImport(job.id, adminId, {});
    const prods = await db.product.findMany({ include: { price: true, attributes: true } });
    expect(prods.find((p) => p.sku === 'NEW-1')?.status).toBe('PUBLISHED');
    expect(prods.find((p) => p.sku === 'NEW-1')?.attributes[0]?.value).toBe('20W');
    expect(prods.find((p) => p.sku === 'OLD-1')?.price?.amountGel.toFixed(2)).toBe('12.50');
    expect(prods.find((p) => p.sku === 'OLD-2')?.isHidden).toBe(false);
  });

  it('commit is idempotent: the same job cannot be committed twice; re-importing the file is UNCHANGED', async () => {
    const buf = csv([H, ['NEW-1', 'chargers', 'ახალი', '5', '', '']]);
    const { job } = await run(buf, 'p.csv', 'PARTIAL');
    await commitImport(job.id, adminId, {});
    await expect(commitImport(job.id, adminId, {})).rejects.toThrow('job_already_processed');
    const { plan } = await run(buf, 'p.csv', 'PARTIAL');
    expect(plan.totals).toMatchObject({ create: 0, update: 0, unchanged: 1 });
    expect(await db.product.count({ where: { sku: 'NEW-1' } })).toBe(1);
  });

  it('full-catalog import hides absent SKUs only after explicit count confirmation; never deletes', async () => {
    const buf = csv([H, ['OLD-1', 'chargers', 'პროდუქტი OLD-1', '10', '', '']]);
    const { job, plan } = await run(buf, 'full.csv', 'FULL_CATALOG');
    expect(plan.hide.map((h) => h.sku)).toEqual(['OLD-2']);
    await expect(commitImport(job.id, adminId, { confirmHideCount: 0 })).rejects.toThrow('hide_confirmation_mismatch');
    await commitImport(job.id, adminId, { confirmHideCount: 1 });
    const old2 = await db.product.findUniqueOrThrow({ where: { sku: 'OLD-2' } });
    expect(old2.isHidden).toBe(true);
    expect(await db.product.count()).toBe(2);
  });

  it('invalid rows (duplicate SKU, bad price) block commit entirely', async () => {
    const buf = csv([H, ['X', 'chargers', 'a', '-3', '', ''], ['Y', 'chargers', 'b', '1', '', ''], ['Y', 'chargers', 'c', '1', '', '']]);
    const { job, plan } = await run(buf, 'bad.csv', 'PARTIAL');
    expect(plan.totals.invalid).toBe(3);
    await expect(commitImport(job.id, adminId, {})).rejects.toThrow('fix_invalid_rows');
    expect(await db.product.count()).toBe(2);
  });

  it('stale preview is rejected if the catalog changed after the dry run', async () => {
    const buf = csv([H, ['NEW-9', 'chargers', 'a', '1', '', '']]);
    const { job } = await run(buf, 'p.csv', 'PARTIAL');
    const c = await db.category.findFirstOrThrow();
    await makeProduct('NEW-9', c.id);
    await expect(commitImport(job.id, adminId, {})).rejects.toThrow('stale_preview');
  });

  it('xlsx input works, creates new categories, and cached formula results are used (never evaluated)', async () => {
    const buf = await toXlsx([{ sku: 'XL-1', category: 'Car Kits', name_ka: 'ავტო', wholesale_price_gel_vat_included: '7', status: 'draft', specifications: '' }], H);
    const { job, plan } = await run(buf, 'cat.xlsx', 'PARTIAL');
    expect(plan.totals.newCategories).toEqual(['car-kits']);
    await commitImport(job.id, adminId, {});
    expect(await db.category.findUnique({ where: { slug: 'car-kits' } })).not.toBeNull();
    expect((await db.importJob.findUniqueOrThrow({ where: { id: job.id } })).rawRows).toEqual({ purged: true });
  });

  it('rejects non-spreadsheet content disguised as xlsx', async () => {
    await expect(createImportJob(Buffer.from('<html>'), 'evil.xlsx', 'PARTIAL', adminId)).rejects.toThrow('not_xlsx');
  });
});

describe('export → import round trip', () => {
  it('re-importing an export is all UNCHANGED (incl. formula-escaped cells)', async () => {
    const c = await db.category.findFirstOrThrow();
    await db.product.create({ data: { sku: 'RT-1', slug: 'rt-1', categoryId: c.id, translations: { create: { locale: 'ka', name: '=SUM(1,2)' } }, attributes: { create: { key: 'p', labelKa: 'სიმძლავრე', value: '20W' } }, price: { create: { amountGel: '3.30' } } } });
    const { exportRows, toXlsx, EXPORT_COLUMNS } = await import('@/server/import/export');
    const buf = await toXlsx(await exportRows(), EXPORT_COLUMNS);
    const { plan } = await run(buf, 'export.xlsx', 'FULL_CATALOG');
    expect(plan.rows.filter((r) => r.action !== 'UNCHANGED').map((r) => [r.sku, r.action, r.errors, r.diff])).toEqual([]);
    expect(plan.totals).toMatchObject({ create: 0, update: 0, invalid: 0, hide: 0, unchanged: 3 });
  });
});

describe('import safety', () => {
  it('a partial import never un-hides a product an admin hid manually', async () => {
    await db.product.update({ where: { sku: 'OLD-2' }, data: { isHidden: true, hiddenReason: 'manual' } });
    const { job } = await run(csv([H, ['OLD-2', 'chargers', 'პროდუქტი OLD-2', '11', '', '']]), 'p.csv', 'PARTIAL');
    await commitImport(job.id, adminId, {});
    expect((await db.product.findUniqueOrThrow({ where: { sku: 'OLD-2' } })).isHidden).toBe(true);
  });
  it('stale guard detects a different change set even when counts match', async () => {
    const { job } = await run(csv([H, ['OLD-1', 'chargers', 'პროდუქტი OLD-1', '99', '', '']]), 'p.csv', 'PARTIAL');
    await db.wholesalePrice.updateMany({ where: { product: { sku: 'OLD-1' } }, data: { amountGel: '50.00' } });
    await expect(commitImport(job.id, adminId, {})).rejects.toThrow('stale_preview');
  });
});
