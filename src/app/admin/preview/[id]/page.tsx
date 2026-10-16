import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { getDraftSections } from '@/server/services/content';
import { RenderSections } from '@/components/sections/render';

export const metadata = { robots: { index: false, follow: false } };

/** Admin-only draft preview. Read-only — nothing is published from here. */
export default async function Preview({ params, searchParams }: PageProps<'/admin/preview/[id]'>) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const locale = sp.locale === 'en' ? 'en' : 'ka';
  setRequestLocale(locale);
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();
  const sections = await getDraftSections(id);
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="sticky top-0 z-50 flex items-center justify-between bg-spark px-4 py-2 text-sm font-semibold text-ink">
        <span>გადახედვა (დრაფტი) — {page.key} · {locale.toUpperCase()} · {locale === 'en' ? 'EN ტექსტი ჩანს მხოლოდ დამტკიცებულ სექციებში' : ''}</span>
        <a href={`/admin/pages/${id}`} className="underline">← რედაქტორი</a>
      </div>
      <div className="bg-paper" lang={locale}>
        <RenderSections sections={sections} locale={locale} />
      </div>
    </NextIntlClientProvider>
  );
}
