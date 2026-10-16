import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { CmsPage, cmsMetadata } from '@/server/cms-page';
import type { Locale } from '@/server/services/catalog';

/** Admin-created CMS pages (/ka/<slug>). System pages have their own routes. */
async function findKey(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const p = await db.page.findUnique({ where: { slug }, select: { key: true, isSystem: true, publishedAt: true } });
  return p && !p.isSystem && p.publishedAt ? p.key : null;
}

export async function generateMetadata({ params }: PageProps<'/[locale]/[slug]'>) {
  const { locale, slug } = await params;
  const key = await findKey(slug);
  return key ? cmsMetadata(key, `/${slug}`, locale as Locale) : {};
}

export default async function DynamicPage({ params }: PageProps<'/[locale]/[slug]'>) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const key = await findKey(slug);
  if (!key) notFound();
  return <CmsPage pageKey={key} locale={locale as Locale} />;
}
