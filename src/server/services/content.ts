import 'server-only';
import { db } from '@/lib/db';
import { parseSection, type SectionType } from '@/lib/page-builder/registry';
import { sanitizeRichText } from '@/lib/sanitize';
import type { Locale } from './catalog';

export type RenderSection = { id: string; type: SectionType; data: Record<string, unknown>; enApproved: boolean };

/** Sanitise any rich-text fields before persisting (defence in depth; render also sanitises). */
export function sanitizeSectionData(type: string, data: Record<string, unknown>) {
  if (type === 'RichText' && data.body && typeof data.body === 'object') {
    const b = data.body as { ka?: string; en?: string };
    data.body = { ka: sanitizeRichText(b.ka ?? ''), en: sanitizeRichText(b.en ?? '') };
  }
  return data;
}

export async function getPublishedPage(key: string) {
  const page = await db.page.findUnique({
    where: { key },
    include: {
      translations: true,
      sections: { where: { revision: 'PUBLISHED', hidden: false }, orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!page || !page.publishedAt) return null;
  return {
    ...page,
    sections: page.sections
      .map((s) => {
        const parsed = parseSection(s.type, s.data);
        return parsed.success ? ({ id: s.id, type: s.type as SectionType, data: parsed.data as Record<string, unknown>, enApproved: s.enStatus === 'APPROVED' } satisfies RenderSection) : null;
      })
      .filter((x): x is RenderSection => x !== null),
  };
}

export async function getDraftSections(pageId: string): Promise<RenderSection[]> {
  const rows = await db.pageSection.findMany({ where: { pageId, revision: 'DRAFT', hidden: false }, orderBy: { sortOrder: 'asc' } });
  return rows
    .map((s) => {
      const parsed = parseSection(s.type, s.data);
      return parsed.success ? { id: s.id, type: s.type as SectionType, data: parsed.data as Record<string, unknown>, enApproved: s.enStatus === 'APPROVED' } : null;
    })
    .filter((x): x is RenderSection => x !== null);
}

export function pageMeta(page: { translations: { locale: string; title: string; seoTitle: string | null; seoDesc: string | null; status: string }[] }, locale: Locale) {
  const ka = page.translations.find((t) => t.locale === 'ka');
  const en = page.translations.find((t) => t.locale === 'en' && t.status === 'APPROVED');
  const t = locale === 'en' ? en ?? ka : ka;
  return { title: t?.seoTitle || t?.title || '', description: t?.seoDesc || '', enApproved: !!en };
}

/** Publish: replace PUBLISHED rows with a copy of current DRAFT rows, atomically. */
export async function publishPage(pageId: string) {
  await db.$transaction(async (tx) => {
    const drafts = await tx.pageSection.findMany({ where: { pageId, revision: 'DRAFT' }, orderBy: { sortOrder: 'asc' } });
    await tx.pageSection.deleteMany({ where: { pageId, revision: 'PUBLISHED' } });
    for (const d of drafts) {
      await tx.pageSection.create({ data: { pageId, revision: 'PUBLISHED', type: d.type, sortOrder: d.sortOrder, hidden: d.hidden, data: d.data ?? {}, enStatus: d.enStatus } });
    }
    await tx.page.update({ where: { id: pageId }, data: { publishedAt: new Date(), hasDraft: false } });
  });
}

export async function getSettings(keys: string[], locale: Locale): Promise<Record<string, string>> {
  const rows = await db.siteSetting.findMany({ where: { key: { in: keys } } });
  const out: Record<string, string> = {};
  for (const r of rows) {
    const v = locale === 'en' && r.enStatus === 'APPROVED' && r.valueEn ? r.valueEn : r.valueKa;
    if (v) out[r.key] = v;
  }
  return out;
}

export async function listActiveStores(locale: Locale) {
  const rows = await db.partnerStore.findMany({ where: { isActive: true }, orderBy: [{ city: 'asc' }, { sortOrder: 'asc' }, { nameKa: 'asc' }] });
  return rows.map((s) => ({
    id: s.id,
    name: (locale === 'en' && s.nameEn) || s.nameKa,
    city: (locale === 'en' && s.cityEn) || s.city,
    address: (locale === 'en' && s.addressEn) || s.addressKa,
    phone: s.phone,
    mapUrl: s.mapUrl,
  }));
}

export async function listActiveBanners(placement: string, locale: Locale) {
  const rows = await db.banner.findMany({ where: { isActive: true, placement }, orderBy: { sortOrder: 'asc' }, include: { image: true } });
  return rows.map((b) => {
    const en = locale === 'en' && b.enStatus === 'APPROVED';
    return { id: b.id, title: (en && b.titleEn) || b.titleKa, text: (en && b.textEn) || b.textKa, linkUrl: b.linkUrl, imageUrl: b.image?.url ?? null };
  });
}

export async function mediaMap(ids: string[]) {
  const clean = [...new Set(ids.filter(Boolean))];
  if (!clean.length) return new Map<string, { url: string; width: number | null; height: number | null; alt: string | null; altEn: string | null }>();
  const rows = await db.mediaAsset.findMany({ where: { id: { in: clean } }, select: { id: true, url: true, width: true, height: true, altKa: true, altEn: true } });
  return new Map(rows.map((r) => [r.id, { url: r.url, width: r.width, height: r.height, alt: r.altKa, altEn: r.altEn }]));
}
