import 'server-only';
import { db } from '@/lib/db';
import { sha256 } from '@/lib/crypto';
import { slugify } from '@/lib/slug';
import { buildPlan, planFingerprint, type ExistingSnapshot, type CategoryRef, type Plan, type RawRow, type NormalizedRow } from '@/lib/import/core';
import type { Mapping } from '@/lib/import/fields';
import { suggestMapping } from '@/lib/import/fields';
import type { ImportMode, Prisma } from '@/generated/prisma/client';
import { parseSpreadsheet } from './parse';
import { audit } from '../audit';
import { fetchRemoteImage, ingestImage } from '../services/media';

export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;

export async function createImportJob(buf: Buffer, fileName: string, mode: ImportMode, adminId: string) {
  if (buf.length > MAX_IMPORT_BYTES) throw new Error('file_too_large');
  const parsed = await parseSpreadsheet(buf, fileName);
  const mapping = suggestMapping(parsed.headers);
  const job = await db.importJob.create({
    data: {
      fileName: fileName.slice(0, 200), fileHash: sha256(buf), mode, mapping, headers: parsed.headers,
      rawRows: { headerRow: parsed.headerRow, rows: parsed.rows } as unknown as Prisma.InputJsonValue,
      totals: {}, createdById: adminId,
    },
  });
  await audit(adminId, 'import.upload', 'ImportJob', job.id, { fileName, mode, rows: parsed.rows.length });
  return job;
}

async function loadState() {
  const [products, cats] = await Promise.all([
    db.product.findMany({
      select: {
        id: true, sku: true, status: true, isHidden: true, retailPrice: true, hiddenReason: true, color: true, modelNumber: true, featured: true, sortOrder: true,
        category: { select: { slug: true } },
        translations: { select: { locale: true, name: true, description: true } },
        price: { select: { amountGel: true } },
        images: { select: { asset: { select: { sourceRef: true, id: true } } }, orderBy: { sortOrder: 'asc' } },
        attributes: { select: { key: true, labelKa: true, value: true }, orderBy: { sortOrder: 'asc' } },
      },
    }),
    db.category.findMany({ select: { slug: true, translations: { select: { name: true } } } }),
  ]);
  const existing: ExistingSnapshot[] = products.map((p) => {
    const ka = p.translations.find((t) => t.locale === 'ka');
    const en = p.translations.find((t) => t.locale === 'en');
    return {
      id: p.id, sku: p.sku, categorySlug: p.category.slug, nameKa: ka?.name ?? '', descriptionKa: ka?.description ?? null,
      nameEn: en?.name ?? null, descriptionEn: en?.description ?? null, price: p.price ? p.price.amountGel.toFixed(2) : null, retailPrice: p.retailPrice ? p.retailPrice.toFixed(2) : null,
      status: p.status, isHidden: p.isHidden, hiddenByImport: !!p.hiddenReason?.startsWith('absent from full import'), color: p.color, modelNumber: p.modelNumber,
      imageRefs: p.images.map((i) => i.asset.sourceRef ?? `media:${i.asset.id}`), specs: p.attributes, featured: p.featured, sortOrder: p.sortOrder,
    };
  });
  const catRefs: CategoryRef[] = cats.map((c) => ({ slug: c.slug, names: c.translations.map((t) => t.name) }));
  return { existing, catRefs };
}

function jobRows(job: { rawRows: unknown }) {
  const r = job.rawRows as { headerRow: number; rows: RawRow[] };
  return { headerRow: r.headerRow ?? 1, rows: r.rows ?? [] };
}

/** Dry run: computes the plan and stores per-row results. Makes NO catalog changes. */
export async function previewImport(jobId: string, mapping: Mapping) {
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status !== 'PREVIEWED') throw new Error('job_not_open');
  const { existing, catRefs } = await loadState();
  const { headerRow, rows } = jobRows(job);
  const plan = buildPlan(rows, mapping, existing, catRefs, job.mode, headerRow + 1);
  await db.$transaction([
    db.importJobRow.deleteMany({ where: { jobId } }),
    db.importJobRow.createMany({
      data: [
        ...plan.rows.map((r) => ({ jobId, rowNum: r.rowNum, sku: r.sku, action: r.action, errors: r.errors, diff: (r.diff ?? undefined) as Prisma.InputJsonValue | undefined, payload: r.row ? ({ ...r.row, categorySlug: r.categorySlug } as unknown as Prisma.InputJsonValue) : undefined })),
        ...plan.hide.map((h) => ({ jobId, rowNum: 0, sku: h.sku, action: 'HIDE' as const, errors: [] })),
      ],
    }),
    db.importJob.update({ where: { id: jobId }, data: { mapping, totals: { ...plan.totals, planHash: sha256(planFingerprint(plan)) }, hideCount: plan.hide.length, hideSample: plan.hide.slice(0, 10).map((h) => h.sku) } }),
  ]);
  return plan;
}

export class CommitError extends Error {}

/**
 * Commit a previewed job. Guards: job must be PREVIEWED (atomic claim → idempotent),
 * zero invalid rows, mapping unchanged, the plan recomputed now must match the preview
 * (stale-preview guard), and FULL_CATALOG requires the admin to confirm the exact hide count.
 */
export async function commitImport(jobId: string, adminId: string, opts: { confirmHideCount?: number }) {
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status !== 'PREVIEWED') throw new CommitError('job_already_processed');
  const totals = job.totals as Plan['totals'];
  if (!totals || totals.total === undefined) throw new CommitError('run_preview_first');
  if (totals.invalid > 0) throw new CommitError('fix_invalid_rows');
  const mapping = job.mapping as Mapping;
  const { existing, catRefs } = await loadState();
  const { headerRow, rows } = jobRows(job);
  const plan = buildPlan(rows, mapping, existing, catRefs, job.mode, headerRow + 1);
  // Stale-preview guard: the exact set of changes must match what the admin reviewed.
  if (sha256(planFingerprint(plan)) !== totals.planHash) throw new CommitError('stale_preview');
  if (job.mode === 'FULL_CATALOG' && opts.confirmHideCount !== plan.hide.length) throw new CommitError('hide_confirmation_mismatch');

  const imageWork: { productId: string; refs: string[]; nameKa: string }[] = [];
  await db.$transaction(
    async (tx) => {
      const claimed = await tx.importJob.updateMany({ where: { id: jobId, status: 'PREVIEWED' }, data: { status: 'COMMITTED', committedAt: new Date() } });
      if (claimed.count !== 1) throw new CommitError('job_already_processed');

      // Categories (create missing)
      const catIds = new Map((await tx.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
      for (const r of plan.rows) {
        if (!r.row || !r.categorySlug || catIds.has(r.categorySlug)) continue;
        const c = await tx.category.create({
          data: {
            slug: r.categorySlug, sortOrder: 100,
            translations: { create: [{ locale: 'ka', name: r.row.categoryNameKa || r.row.category, status: 'APPROVED' }, ...(r.row.categoryNameEn ? [{ locale: 'en', name: r.row.categoryNameEn, status: 'DRAFT_REVIEW' as const }] : [])] },
          },
        });
        catIds.set(c.slug, c.id);
      }

      const exBySku = new Map(existing.map((e) => [e.sku.toLowerCase(), e]));
      for (const r of plan.rows) {
        if (!r.row || (r.action !== 'CREATE' && r.action !== 'UPDATE')) continue;
        const row: NormalizedRow = r.row;
        const categoryId = catIds.get(r.categorySlug!)!;
        if (r.action === 'CREATE') {
          const slug = await uniqueSlug(tx, row);
          const p = await tx.product.create({
            data: {
              sku: row.sku, slug, categoryId, retailPrice: row.retailPrice ?? null, color: row.color, modelNumber: row.modelNumber, status: row.status ?? 'DRAFT',
              publishedAt: row.status === 'PUBLISHED' ? new Date() : null, featured: row.featured ?? false, sortOrder: row.sortOrder ?? 0,
              translations: {
                create: [
                  { locale: 'ka', name: row.nameKa, description: row.descriptionKa || null, status: 'APPROVED', source: 'import' },
                  ...(row.nameEn ? [{ locale: 'en', name: row.nameEn, description: row.descriptionEn || null, status: 'DRAFT_REVIEW' as const, source: 'import' }] : []),
                ],
              },
              attributes: { create: (row.specs ?? []).map((s, i) => ({ key: s.key, labelKa: s.labelKa, value: s.value, sortOrder: i })) },
              ...(row.price !== undefined ? { price: { create: { amountGel: row.price } } } : {}),
            },
          });
          if (row.images?.length) imageWork.push({ productId: p.id, refs: row.images, nameKa: row.nameKa });
        } else {
          const ex = exBySku.get(row.sku.toLowerCase())!;
          const d = r.diff ?? {};
          await tx.product.update({
            where: { id: ex.id },
            data: {
              categoryId,
              ...(d.color ? { color: row.color } : {}),
              ...(d.retail_price && row.retailPrice !== undefined ? { retailPrice: row.retailPrice } : {}),
              ...(d.model_number ? { modelNumber: row.modelNumber } : {}),
              ...(d.status ? { status: row.status, publishedAt: row.status === 'PUBLISHED' ? new Date() : undefined } : {}),
              ...(d.featured ? { featured: row.featured } : {}),
              ...(d.sort_order ? { sortOrder: row.sortOrder } : {}),
              ...(d.hidden ? { isHidden: false, hiddenReason: null } : {}),
            },
          });
          if (d.name_ka || d.description_ka) {
            await tx.productTranslation.upsert({
              where: { productId_locale: { productId: ex.id, locale: 'ka' } },
              create: { productId: ex.id, locale: 'ka', name: row.nameKa, description: row.descriptionKa ?? null, status: 'APPROVED', source: 'import' },
              update: { name: row.nameKa, ...(row.descriptionKa !== undefined ? { description: row.descriptionKa || null } : {}) },
            });
          }
          if (d.name_en || d.description_en) {
            // Imported English is never auto-public: it goes back to review.
            await tx.productTranslation.upsert({
              where: { productId_locale: { productId: ex.id, locale: 'en' } },
              create: { productId: ex.id, locale: 'en', name: row.nameEn ?? row.nameKa, description: row.descriptionEn ?? null, status: 'DRAFT_REVIEW', source: 'import' },
              update: { ...(row.nameEn ? { name: row.nameEn } : {}), ...(row.descriptionEn !== undefined ? { description: row.descriptionEn } : {}), status: 'DRAFT_REVIEW', source: 'import' },
            });
          }
          if (d.price && row.price !== undefined) {
            await tx.wholesalePrice.upsert({ where: { productId: ex.id }, create: { productId: ex.id, amountGel: row.price }, update: { amountGel: row.price } });
          }
          if (d.specifications && row.specs) {
            await tx.productAttribute.deleteMany({ where: { productId: ex.id } });
            await tx.productAttribute.createMany({ data: row.specs.map((s, i) => ({ productId: ex.id, key: s.key, labelKa: s.labelKa, value: s.value, sortOrder: i })) });
          }
          if (d.images && row.images) imageWork.push({ productId: ex.id, refs: row.images, nameKa: row.nameKa });
        }
      }

      if (job.mode === 'FULL_CATALOG' && plan.hide.length) {
        await tx.product.updateMany({ where: { id: { in: plan.hide.map((h) => h.id) } }, data: { isHidden: true, hiddenReason: `absent from full import ${jobId}` } });
      }
      await tx.importJob.update({ where: { id: jobId }, data: { rawRows: { purged: true } } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  const imageErrors = await processImages(imageWork);
  if (imageErrors.length) await db.importJob.update({ where: { id: jobId }, data: { error: imageErrors.slice(0, 50).join('\n') } });
  await audit(adminId, 'import.commit', 'ImportJob', jobId, { mode: job.mode, totals: plan.totals, imageErrors: imageErrors.length });
  return { totals: plan.totals, imageErrors };
}

async function uniqueSlug(tx: Prisma.TransactionClient, row: NormalizedRow) {
  const base = slugify(`${row.sku} ${row.nameKa}`, 80);
  let slug = base;
  for (let i = 2; await tx.product.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

async function processImages(work: { productId: string; refs: string[]; nameKa: string }[]) {
  const errors: string[] = [];
  for (const w of work) {
    const assetIds: string[] = [];
    let failed = false;
    for (const ref of w.refs) {
      try {
        if (ref.startsWith('media:')) {
          const a = await db.mediaAsset.findUnique({ where: { id: ref.slice(6) } });
          if (!a) throw new Error('media_not_found');
          assetIds.push(a.id);
          continue;
        }
        const reuse = await db.mediaAsset.findFirst({ where: { sourceRef: ref } });
        if (reuse) {
          assetIds.push(reuse.id);
          continue;
        }
        const buf = await fetchRemoteImage(ref);
        const asset = await ingestImage(buf, new URL(ref).pathname.split('/').pop() || 'image', { ka: w.nameKa }, 'products');
        await db.mediaAsset.update({ where: { id: asset.id }, data: { sourceRef: ref } });
        assetIds.push(asset.id);
      } catch (e) {
        failed = true;
        errors.push(`${w.productId}: ${ref.slice(0, 80)} — ${(e as Error).message}`);
      }
    }
    // Replace the gallery only if every image succeeded; otherwise keep the existing images untouched.
    if (!failed && assetIds.length) {
      await db.$transaction([
        db.productImage.deleteMany({ where: { productId: w.productId } }),
        db.productImage.createMany({ data: assetIds.map((assetId, i) => ({ productId: w.productId, assetId, sortOrder: i })) }),
      ]);
    }
  }
  return errors;
}
