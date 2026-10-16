'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, tableRef } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { isSafeHref } from '@/lib/urls';
import { collectLocalized, emptySection, isSectionType, parseSection, setAtPath } from '@/lib/page-builder/registry';
import { requireAdmin } from '../../auth/guards';
import { audit } from '../../audit';
import { publishPage, sanitizeSectionData } from '../../services/content';
import { ingestImage, MediaError, MAX_UPLOAD_BYTES } from '../../services/media';
import { storage } from '../../storage';
import { translateStrings, TranslationError } from '../../services/translation';
import { rateLimit, RATE_RULES } from '../../rate-limit';
import type { Prisma } from '@/generated/prisma/client';
import type { AState } from './auth';

const touch = (pageId: string) => db.page.update({ where: { id: pageId }, data: { hasDraft: true } });

// ── Pages ──
export async function createPageAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const title = String(fd.get('title') ?? '').trim().slice(0, 160);
  if (!title) return { error: 'სათაური სავალდებულოა.' };
  const slug = slugify(String(fd.get('slug') || title), 60);
  const reserved = ['products', 'categories', 'where-to-buy', 'partners', 'contact', 'account', 'admin', 'api'];
  if (reserved.includes(slug)) return { error: 'ეს მისამართი დაცულია.' };
  if (await db.page.findFirst({ where: { OR: [{ slug }, { key: slug }] } })) return { error: 'slug უკვე არსებობს.' };
  const page = await db.page.create({ data: { key: slug, slug, translations: { create: { locale: 'ka', title } } } });
  await audit(admin.id, 'page.create', 'Page', page.id);
  redirect(`/admin/pages/${page.id}`);
}

export async function savePageMetaAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const pageId = String(fd.get('pageId'));
  const s = (k: string, n: number) => String(fd.get(k) ?? '').trim().slice(0, n) || null;
  await db.pageTranslation.upsert({ where: { pageId_locale: { pageId, locale: 'ka' } }, create: { pageId, locale: 'ka', title: s('titleKa', 160) ?? '—', seoTitle: s('seoTitleKa', 200), seoDesc: s('seoDescKa', 300) }, update: { title: s('titleKa', 160) ?? '—', seoTitle: s('seoTitleKa', 200), seoDesc: s('seoDescKa', 300) } });
  if (s('titleEn', 160)) {
    const status = fd.get('enIntent') === 'approve' ? 'APPROVED' : 'DRAFT_REVIEW';
    await db.pageTranslation.upsert({ where: { pageId_locale: { pageId, locale: 'en' } }, create: { pageId, locale: 'en', title: s('titleEn', 160)!, seoTitle: s('seoTitleEn', 200), seoDesc: s('seoDescEn', 300), status }, update: { title: s('titleEn', 160)!, seoTitle: s('seoTitleEn', 200), seoDesc: s('seoDescEn', 300), status } });
  }
  await audit(admin.id, 'page.meta', 'Page', pageId);
  revalidatePath(`/admin/pages/${pageId}`);
  return { ok: true };
}

export async function addSectionAction(fd: FormData) {
  const admin = await requireAdmin();
  const pageId = String(fd.get('pageId'));
  const type = String(fd.get('type'));
  if (!isSectionType(type)) return;
  const max = await db.pageSection.aggregate({ where: { pageId, revision: 'DRAFT' }, _max: { sortOrder: true } });
  const s = await db.pageSection.create({ data: { pageId, revision: 'DRAFT', type, sortOrder: (max._max.sortOrder ?? -1) + 1, data: emptySection(type) as Prisma.InputJsonValue } });
  await touch(pageId);
  await audit(admin.id, 'section.add', 'PageSection', s.id, { type });
  revalidatePath(`/admin/pages/${pageId}`);
}

/** Saves one section's JSON after schema validation + rich-text sanitisation. Editing EN text resets review. */
export async function saveSectionAction(sectionId: string, json: string): Promise<AState> {
  const admin = await requireAdmin();
  const sec = await db.pageSection.findUniqueOrThrow({ where: { id: sectionId } });
  if (sec.revision !== 'DRAFT') return { error: 'მხოლოდ დრაფტის რედაქტირებაა შესაძლებელი.' };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { error: 'არასწორი მონაცემები.' };
  }
  const parsed = parseSection(sec.type, raw);
  if (!parsed.success) return { error: `ვალიდაცია: ${parsed.error}` };
  const clean = sanitizeSectionData(sec.type, parsed.data as Record<string, unknown>);
  const enBefore = JSON.stringify(collectLocalized(sec.data).map((x) => x.en));
  const enAfter = JSON.stringify(collectLocalized(clean).map((x) => x.en));
  const kaBefore = JSON.stringify(collectLocalized(sec.data).map((x) => x.ka));
  const kaAfter = JSON.stringify(collectLocalized(clean).map((x) => x.ka));
  const enChanged = enBefore !== enAfter || kaBefore !== kaAfter;
  const hasEn = collectLocalized(clean).some((x) => x.en.trim());
  await db.pageSection.update({ where: { id: sectionId }, data: { data: clean as Prisma.InputJsonValue, ...(enChanged ? { enStatus: hasEn ? 'DRAFT_REVIEW' : 'NONE' } : {}) } });
  await touch(sec.pageId);
  await audit(admin.id, 'section.save', 'PageSection', sectionId);
  revalidatePath(`/admin/pages/${sec.pageId}`);
  return { ok: true };
}

export async function sectionOpAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const op = String(fd.get('op'));
  const sec = await db.pageSection.findUniqueOrThrow({ where: { id } });
  if (sec.revision !== 'DRAFT') return;
  if (op === 'delete') await db.pageSection.delete({ where: { id } });
  else if (op === 'toggle') await db.pageSection.update({ where: { id }, data: { hidden: !sec.hidden } });
  else if (op === 'approveEn') await db.pageSection.update({ where: { id }, data: { enStatus: 'APPROVED' } });
  else if (op === 'rejectEn') await db.pageSection.update({ where: { id }, data: { enStatus: 'REJECTED' } });
  else if (op === 'up' || op === 'down') {
    const all = await db.pageSection.findMany({ where: { pageId: sec.pageId, revision: 'DRAFT' }, orderBy: { sortOrder: 'asc' } });
    const i = all.findIndex((x) => x.id === id);
    const j = op === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
    await db.$transaction(all.map((x, k) => db.pageSection.update({ where: { id: x.id }, data: { sortOrder: k } })));
  }
  await touch(sec.pageId);
  await audit(admin.id, `section.${op}`, 'PageSection', id);
  revalidatePath(`/admin/pages/${sec.pageId}`);
}

export async function translateSectionAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  if (!(await rateLimit(`translate:${admin.id}`, RATE_RULES.translate))) return;
  const sec = await db.pageSection.findUniqueOrThrow({ where: { id } });
  const strings = collectLocalized(sec.data);
  if (!strings.length) return;
  try {
    const out = await translateStrings(strings.map((s) => ({ id: s.path, ka: s.ka })), { entityType: 'page_section', entityId: id, adminId: admin.id });
    const data = structuredClone(sec.data) as Record<string, unknown>;
    for (const s of strings) setAtPath(data, s.path, out.get(s.path) ?? '');
    await db.pageSection.update({ where: { id }, data: { data: sanitizeSectionData(sec.type, data) as Prisma.InputJsonValue, enStatus: 'DRAFT_REVIEW' } });
    await touch(sec.pageId);
    await audit(admin.id, 'translation.generate', 'PageSection', id);
  } catch (e) {
    console.error('[translate section]', e instanceof TranslationError ? e.code : (e as Error).message);
  }
  revalidatePath(`/admin/pages/${sec.pageId}`);
}

export async function publishPageAction(fd: FormData) {
  const admin = await requireAdmin();
  const pageId = String(fd.get('pageId'));
  await publishPage(pageId);
  await audit(admin.id, 'page.publish', 'Page', pageId);
  revalidatePath(`/admin/pages/${pageId}`);
}

export async function discardDraftAction(fd: FormData) {
  const admin = await requireAdmin();
  const pageId = String(fd.get('pageId'));
  await db.$transaction(async (tx) => {
    const pub = await tx.pageSection.findMany({ where: { pageId, revision: 'PUBLISHED' } });
    await tx.pageSection.deleteMany({ where: { pageId, revision: 'DRAFT' } });
    for (const p of pub) await tx.pageSection.create({ data: { pageId, revision: 'DRAFT', type: p.type, sortOrder: p.sortOrder, hidden: p.hidden, data: p.data ?? {}, enStatus: p.enStatus } });
    await tx.page.update({ where: { id: pageId }, data: { hasDraft: false } });
  });
  await audit(admin.id, 'page.discard_draft', 'Page', pageId);
  revalidatePath(`/admin/pages/${pageId}`);
}

// ── Media library ──
export async function uploadMediaAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  const errors: string[] = [];
  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) { errors.push(`${f.name}: > 4MB`); continue; }
    try {
      const a = await ingestImage(Buffer.from(await f.arrayBuffer()), f.name, { ka: String(fd.get('altKa') ?? '') || undefined });
      await audit(admin.id, 'media.upload', 'MediaAsset', a.id);
    } catch (e) {
      errors.push(`${f.name}: ${e instanceof MediaError ? e.message : 'error'}`);
    }
  }
  revalidatePath('/admin/media');
  return errors.length ? { error: errors.join('; ') } : { ok: true };
}

export async function mediaAltAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  await db.mediaAsset.update({ where: { id }, data: { altKa: String(fd.get('altKa') ?? '').slice(0, 200) || null, altEn: String(fd.get('altEn') ?? '').slice(0, 200) || null } });
  await audit(admin.id, 'media.alt', 'MediaAsset', id);
  revalidatePath('/admin/media');
}

export async function deleteMediaAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const a = await db.mediaAsset.findUniqueOrThrow({ where: { id }, include: { _count: { select: { productImages: true, categories: true, banners: true } } } });
  const [{ n }] = await db.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM ${tableRef('PageSection')} WHERE data::text LIKE $1`, '%' + id + '%');
  const inSections = Number(n);
  if (a._count.productImages || a._count.categories || a._count.banners || inSections) return; // in use — UI shows why
  await storage().delete(a.storageKey).catch(() => {});
  await db.mediaAsset.delete({ where: { id } });
  await audit(admin.id, 'media.delete', 'MediaAsset', id);
  revalidatePath('/admin/media');
}

// ── Banners ──
const bannerSchema = z.object({
  placement: z.string().trim().min(1).max(40), titleKa: z.string().trim().min(1).max(200), titleEn: z.string().trim().max(200).optional(),
  textKa: z.string().trim().max(500).optional(), textEn: z.string().trim().max(500).optional(),
  linkUrl: z.string().trim().max(500).refine((v) => !v || isSafeHref(v), 'unsafe url').optional(),
  imageId: z.string().max(40).optional(), sortOrder: z.coerce.number().int().default(0), isActive: z.literal('on').optional(), enIntent: z.enum(['save', 'approve']).default('save'),
});
export async function saveBannerAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const p = bannerSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('; ') };
  const d = p.data;
  const data = {
    placement: d.placement, titleKa: d.titleKa, titleEn: d.titleEn || null, textKa: d.textKa || null, textEn: d.textEn || null, linkUrl: d.linkUrl || null,
    imageId: d.imageId || null, sortOrder: d.sortOrder, isActive: d.isActive === 'on', enStatus: d.titleEn ? (d.enIntent === 'approve' ? ('APPROVED' as const) : ('DRAFT_REVIEW' as const)) : ('NONE' as const),
  };
  const b = id ? await db.banner.update({ where: { id }, data }) : await db.banner.create({ data });
  await audit(admin.id, id ? 'banner.update' : 'banner.create', 'Banner', b.id);
  revalidatePath('/admin/banners');
  return { ok: true };
}
export async function deleteBannerAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  await db.banner.delete({ where: { id } });
  await audit(admin.id, 'banner.delete', 'Banner', id);
  revalidatePath('/admin/banners');
}

// ── Settings (contact, social, SEO strings) ──
import { SETTING_KEYS } from '@/lib/settings';
export async function saveSettingsAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  for (const key of SETTING_KEYS) {
    const ka = String(fd.get(`${key}:ka`) ?? '').trim().slice(0, 500);
    const en = String(fd.get(`${key}:en`) ?? '').trim().slice(0, 500);
    if (key.startsWith('social.') && ((ka && !/^https:\/\//.test(ka)) || (en && !/^https:\/\//.test(en)))) return { error: `${key}: მხოლოდ https:// ბმული` };
    await db.siteSetting.upsert({ where: { key }, create: { key, valueKa: ka || null, valueEn: en || null, enStatus: en ? 'APPROVED' : 'NONE' }, update: { valueKa: ka || null, valueEn: en || null, enStatus: en ? 'APPROVED' : 'NONE' } });
  }
  await audit(admin.id, 'settings.update', 'SiteSetting');
  revalidatePath('/admin/settings');
  return { ok: true };
}
