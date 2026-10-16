import 'server-only';
import { notFound } from 'next/navigation';
import { getPublishedPage, pageMeta } from '@/server/services/content';
import { RenderSections } from '@/components/sections/render';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/server/services/catalog';

export async function cmsMetadata(key: string, path: string, locale: Locale) {
  const page = await getPublishedPage(key);
  if (!page) return {};
  const m = pageMeta(page, locale);
  return buildMetadata({ title: m.title, description: m.description, path, locale, enIndexable: m.enApproved });
}

export async function CmsPage({ pageKey, locale, before }: { pageKey: string; locale: Locale; before?: React.ReactNode }) {
  const page = await getPublishedPage(pageKey);
  if (!page) notFound();
  return (
    <>
      {before}
      <RenderSections sections={page.sections} locale={locale} />
    </>
  );
}
