import 'server-only';
import { notFound } from 'next/navigation';
import { getPublishedPage, getSettings, pageMeta } from '@/server/services/content';
import { TOKEN_KEYS, fillTokensDeep } from '@/lib/legal-tokens';
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
  const usesTokens = page.sections.some((s) => JSON.stringify(s.data).includes('{{'));
  const values = usesTokens ? await getSettings([...TOKEN_KEYS], locale) : {};
  const sections = usesTokens ? page.sections.map((s) => ({ ...s, data: fillTokensDeep(s.data, values) })) : page.sections;
  return (
    <>
      {before}
      <RenderSections sections={sections} locale={locale} />
    </>
  );
}
