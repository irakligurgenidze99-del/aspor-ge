'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { priceSchema } from '@/lib/validation';
import { requireAdmin } from '../../auth/guards';
import { audit } from '../../audit';
import { ingestImage, MediaError, MAX_UPLOAD_BYTES } from '../../services/media';
import { translateStrings, TranslationError } from '../../services/translation';
import { rateLimit, RATE_RULES } from '../../rate-limit';
import type { AState } from './auth';

const str = (max: number) => z.string().trim().max(max);
const skuRe = /^[A-Za-z0-9][A-Za-z0-9._\-/ ]{0,63}$/;

const productSchema = z.object({
  sku: str(64).regex(skuRe, 'SKU: დაშვებულია ლათინური ასოები, ციფრები და . _ - /'),
  slug: str(90).optional(),
  categoryId: z.string().min(1, 'აირჩიეთ კატეგორია'),
  nameKa: str(200).min(1, 'ქართული დასახელება სავალდებულოა'),
  descriptionKa: str(5000).optional(),
  seoTitleKa: str(200).optional(),
  seoDescKa: str(300).optional(),
  color: str(60).optional(),
  modelNumber: str(80).optional(),
  featured: z.literal('on').optional(),
  sortOrder: z.coerce.number().int().min(-99999).max(99999).default(0),
  price: z.union([z.literal(''), priceSchema]).optional(),
  specs: str(20000).optional(),
});

function parseSpecLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([^:：|]{1,80})\s*[:：|]\s*(.+?)\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .slice(0, 60)
    .map((m, i) => ({ key: slugify(m[1], 40).replace(/-/g, '_') + (i ? '' : ''), labelKa: m[1].trim(), value: m[2].slice(0, 500), sortOrder: i }));
}

function dedupeKeys<T extends { key: string }>(arr: T[]): T[] {
  const seen = new Map<string, number>();
  return arr.map((a) => {
    const n = seen.get(a.key) ?? 0;
    seen.set(a.key, n + 1);
    return n ? { ...a, key: `${a.key}_${n + 1}` } : a;
  });
}

export async function saveProductAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const parsed = productSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' · ') };
  const d = parsed.data;
  const slug = slugify(d.slug || `${d.sku} ${d.nameKa}`, 90);
  const clash = await db.product.findFirst({ where: { OR: [{ sku: d.sku }, { slug }], NOT: id ? { id } : undefined }, select: { sku: true, slug: true } });
  if (clash) return { error: clash.sku === d.sku ? 'ეს SKU უკვე არსებობს.' : 'ეს slug უკვე გამოყენებულია.' };
  const specs = dedupeKeys(parseSpecLines(d.specs ?? ''));
  const base = { sku: d.sku, slug, categoryId: d.categoryId, color: d.color || null, modelNumber: d.modelNumber || null, featured: d.featured === 'on', sortOrder: d.sortOrder };
  const kaTr = { name: d.nameKa, description: d.descriptionKa || null, seoTitle: d.seoTitleKa || null, seoDesc: d.seoDescKa || null };
  let productId = id;
  await db.$transaction(async (tx) => {
    if (id) {
      const before = await tx.product.findUniqueOrThrow({ where: { id }, include: { translations: { where: { locale: 'ka' } } } });
      await tx.product.update({ where: { id }, data: base });
      await tx.productTranslation.upsert({ where: { productId_locale: { productId: id, locale: 'ka' } }, create: { productId: id, locale: 'ka', status: 'APPROVED', source: 'manual', ...kaTr }, update: kaTr });
      // Georgian source changed → approved English is now stale: send back to review.
      const kaBefore = before.translations[0];
      if (kaBefore && (kaBefore.name !== kaTr.name || (kaBefore.description ?? null) !== kaTr.description)) {
        await tx.productTranslation.updateMany({ where: { productId: id, locale: 'en', status: 'APPROVED' }, data: { status: 'DRAFT_REVIEW' } });
      }
    } else {
      const p = await tx.product.create({ data: { ...base, status: 'DRAFT', translations: { create: { locale: 'ka', status: 'APPROVED', source: 'manual', ...kaTr } } } });
      productId = p.id;
    }
    await tx.productAttribute.deleteMany({ where: { productId } });
    if (specs.length) await tx.productAttribute.createMany({ data: specs.map((s) => ({ ...s, productId })) });
    if (d.price === '' || d.price === undefined) await tx.wholesalePrice.deleteMany({ where: { productId } });
    else await tx.wholesalePrice.upsert({ where: { productId }, create: { productId, amountGel: d.price.toFixed(2) }, update: { amountGel: d.price.toFixed(2) } });
  });
  await audit(admin.id, id ? 'product.update' : 'product.create', 'Product', productId, { sku: d.sku, priceSet: d.price !== '' && d.price !== undefined });
  revalidatePath('/admin/products');
  if (!id) redirect(`/admin/products/${productId}?created=1`);
  return { ok: true };
}

/** Publishing requires an explicit review action; validates the minimum public content. */
export async function setProductStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const status = fd.get('status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  if (status === 'PUBLISHED') {
    const p = await db.product.findUniqueOrThrow({ where: { id }, include: { translations: { where: { locale: 'ka' } } } });
    if (!p.translations[0]?.name) throw new Error('ქართული დასახელება სავალდებულოა გამოქვეყნებამდე');
  }
  await db.product.update({ where: { id }, data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : undefined } });
  await audit(admin.id, status === 'PUBLISHED' ? 'product.publish' : 'product.unpublish', 'Product', id);
  revalidatePath(`/admin/products/${id}`);
}

export async function setHiddenAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const hidden = fd.get('hidden') === '1';
  await db.product.update({ where: { id }, data: { isHidden: hidden, hiddenReason: hidden ? 'manual' : null } });
  await audit(admin.id, hidden ? 'product.hide' : 'product.unhide', 'Product', id);
  revalidatePath(`/admin/products/${id}`);
}

export async function bulkProductAction(fd: FormData) {
  const admin = await requireAdmin();
  const ids = fd.getAll('ids').map(String).slice(0, 500);
  const op = String(fd.get('op'));
  if (!ids.length) return;
  if (op === 'publish') await db.product.updateMany({ where: { id: { in: ids } }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  else if (op === 'draft') await db.product.updateMany({ where: { id: { in: ids } }, data: { status: 'DRAFT' } });
  else if (op === 'unhide') await db.product.updateMany({ where: { id: { in: ids } }, data: { isHidden: false, hiddenReason: null } });
  else return;
  await audit(admin.id, `product.bulk_${op}`, 'Product', undefined, { count: ids.length });
  revalidatePath('/admin/products');
}

export async function uploadProductImagesAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const productId = String(fd.get('productId'));
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  const p = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { images: true, translations: { where: { locale: 'ka' } } } });
  let order = p.images.length;
  const errors: string[] = [];
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) { errors.push(`${f.name}: ზომა > 4MB`); continue; }
    try {
      const asset = await ingestImage(Buffer.from(await f.arrayBuffer()), f.name, { ka: p.translations[0]?.name }, 'products');
      await db.productImage.create({ data: { productId, assetId: asset.id, sortOrder: order++ } });
    } catch (e) {
      errors.push(`${f.name}: ${e instanceof MediaError ? e.message : 'შეცდომა'}`);
    }
  }
  await audit(admin.id, 'product.images_upload', 'Product', productId, { count: files.length - errors.length });
  revalidatePath(`/admin/products/${productId}`);
  return errors.length ? { error: errors.join('; ') } : { ok: true };
}

export async function productImageAction(fd: FormData) {
  const admin = await requireAdmin();
  const imageId = String(fd.get('imageId'));
  const op = String(fd.get('op'));
  const img = await db.productImage.findUniqueOrThrow({ where: { id: imageId } });
  const all = await db.productImage.findMany({ where: { productId: img.productId }, orderBy: { sortOrder: 'asc' } });
  if (op === 'remove') {
    await db.productImage.delete({ where: { id: imageId } });
  } else if (op === 'up' || op === 'down') {
    const i = all.findIndex((x) => x.id === imageId);
    const j = op === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < all.length) {
      [all[i], all[j]] = [all[j], all[i]];
      await db.$transaction(all.map((x, k) => db.productImage.update({ where: { id: x.id }, data: { sortOrder: k } })));
    }
  } else if (op === 'alt') {
    await db.productImage.update({ where: { id: imageId }, data: { altKa: String(fd.get('altKa') ?? '').slice(0, 200) || null, altEn: String(fd.get('altEn') ?? '').slice(0, 200) || null } });
  }
  await audit(admin.id, `product.image_${op}`, 'Product', img.productId);
  revalidatePath(`/admin/products/${img.productId}`);
}

// ── English translation (products) ──

export async function translateProductAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  if (!(await rateLimit(`translate:${admin.id}`, RATE_RULES.translate))) return { error: 'თარგმანის ლიმიტი ამოიწურა (საათში). სცადეთ მოგვიანებით.' };
  const id = String(fd.get('id'));
  const p = await db.product.findUniqueOrThrow({ where: { id }, include: { translations: true, attributes: true } });
  const ka = p.translations.find((t) => t.locale === 'ka');
  if (!ka) return { error: 'ქართული ტექსტი არ არის.' };
  const items = [
    { id: 'name', ka: ka.name },
    ...(ka.description ? [{ id: 'description', ka: ka.description }] : []),
    ...(ka.seoTitle ? [{ id: 'seoTitle', ka: ka.seoTitle }] : []),
    ...(ka.seoDesc ? [{ id: 'seoDesc', ka: ka.seoDesc }] : []),
    ...p.attributes.filter((a) => /[Ⴀ-ჿ]/.test(a.labelKa)).map((a) => ({ id: `label:${a.id}`, ka: a.labelKa })),
    ...p.attributes.filter((a) => /[Ⴀ-ჿ]/.test(a.value)).map((a) => ({ id: `value:${a.id}`, ka: a.value })),
  ];
  try {
    const out = await translateStrings(items, { entityType: 'product', entityId: id, adminId: admin.id });
    await db.$transaction([
      db.productTranslation.upsert({
        where: { productId_locale: { productId: id, locale: 'en' } },
        create: { productId: id, locale: 'en', name: out.get('name')!, description: out.get('description') ?? null, seoTitle: out.get('seoTitle') ?? null, seoDesc: out.get('seoDesc') ?? null, status: 'DRAFT_REVIEW', source: `claude:${process.env.ANTHROPIC_MODEL}` },
        update: { name: out.get('name')!, description: out.get('description') ?? null, seoTitle: out.get('seoTitle') ?? null, seoDesc: out.get('seoDesc') ?? null, status: 'DRAFT_REVIEW', source: `claude:${process.env.ANTHROPIC_MODEL}` },
      }),
      ...p.attributes.map((a) => db.productAttribute.update({ where: { id: a.id }, data: { labelEn: out.get(`label:${a.id}`) ?? a.labelEn ?? a.labelKa, valueEn: out.get(`value:${a.id}`) ?? null } })),
    ]);
    await audit(admin.id, 'translation.generate', 'Product', id);
    revalidatePath(`/admin/products/${id}`);
    return { ok: true };
  } catch (e) {
    const code = e instanceof TranslationError ? e.code : 'provider_error';
    return { error: { not_configured: 'Claude API არ არის კონფიგურირებული (ANTHROPIC_API_KEY / ANTHROPIC_MODEL).', rate_limited: 'Claude API-ს ლიმიტი — სცადეთ მოგვიანებით.', invalid_output: 'მოდელმა არასწორი ფორმატი დააბრუნა — სცადეთ თავიდან.', provider_error: 'Claude API-ს შეცდომა — სცადეთ მოგვიანებით.' }[code] };
  }
}

export async function saveEnglishProductAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const intent = String(fd.get('intent')); // save | approve | reject
  const name = String(fd.get('nameEn') ?? '').trim().slice(0, 200);
  if (!name && intent !== 'reject') return { error: 'English name is required.' };
  const status = intent === 'approve' ? 'APPROVED' : intent === 'reject' ? 'REJECTED' : 'DRAFT_REVIEW';
  const data = {
    name: name || 'rejected',
    description: String(fd.get('descriptionEn') ?? '').trim().slice(0, 5000) || null,
    seoTitle: String(fd.get('seoTitleEn') ?? '').trim().slice(0, 200) || null,
    seoDesc: String(fd.get('seoDescEn') ?? '').trim().slice(0, 300) || null,
    status,
  } as const;
  await db.productTranslation.upsert({ where: { productId_locale: { productId: id, locale: 'en' } }, create: { productId: id, locale: 'en', source: 'manual', ...data }, update: data });
  for (const [k, v] of fd.entries()) {
    const m = k.match(/^attr:(label|value):(.+)$/);
    if (m) await db.productAttribute.updateMany({ where: { id: m[2], productId: id }, data: m[1] === 'label' ? { labelEn: String(v).slice(0, 120) || null } : { valueEn: String(v).slice(0, 500) || null } });
  }
  await audit(admin.id, `translation.${intent}`, 'Product', id);
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin/translations');
  return { ok: true };
}

// ── Categories ──
const catSchema = z.object({ slug: str(60).optional(), nameKa: str(120).min(1), descriptionKa: str(2000).optional(), nameEn: str(120).optional(), descriptionEn: str(2000).optional(), sortOrder: z.coerce.number().int().default(0), isActive: z.literal('on').optional(), enIntent: z.enum(['save', 'approve']).default('save') });

export async function saveCategoryAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const p = catSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: 'შეავსეთ ქართული სახელი.' };
  const d = p.data;
  const slug = slugify(d.slug || d.nameKa, 60);
  const clash = await db.category.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (clash) return { error: 'slug უკვე გამოყენებულია.' };
  const cat = id
    ? await db.category.update({ where: { id }, data: { slug, sortOrder: d.sortOrder, isActive: d.isActive === 'on' } })
    : await db.category.create({ data: { slug, sortOrder: d.sortOrder, isActive: d.isActive === 'on' } });
  await db.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: cat.id, locale: 'ka' } }, create: { categoryId: cat.id, locale: 'ka', name: d.nameKa, description: d.descriptionKa || null }, update: { name: d.nameKa, description: d.descriptionKa || null } });
  if (d.nameEn) {
    const st = d.enIntent === 'approve' ? 'APPROVED' : 'DRAFT_REVIEW';
    await db.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: cat.id, locale: 'en' } }, create: { categoryId: cat.id, locale: 'en', name: d.nameEn, description: d.descriptionEn || null, status: st }, update: { name: d.nameEn, description: d.descriptionEn || null, status: st } });
  }
  await audit(admin.id, id ? 'category.update' : 'category.create', 'Category', cat.id);
  revalidatePath('/admin/categories');
  return { ok: true };
}

export async function translateCategoryAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  if (!(await rateLimit(`translate:${admin.id}`, RATE_RULES.translate))) return;
  const c = await db.category.findUniqueOrThrow({ where: { id }, include: { translations: true } });
  const ka = c.translations.find((t) => t.locale === 'ka')!;
  try {
    const out = await translateStrings([{ id: 'name', ka: ka.name }, ...(ka.description ? [{ id: 'description', ka: ka.description }] : [])], { entityType: 'category', entityId: id, adminId: admin.id });
    await db.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: id, locale: 'en' } }, create: { categoryId: id, locale: 'en', name: out.get('name')!, description: out.get('description') ?? null, status: 'DRAFT_REVIEW' }, update: { name: out.get('name')!, description: out.get('description') ?? null, status: 'DRAFT_REVIEW' } });
  } catch (e) {
    console.error('[translate category]', (e as Error).message);
  }
  revalidatePath('/admin/categories');
}
