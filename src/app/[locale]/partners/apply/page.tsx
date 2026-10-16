import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { ApplyForm } from '@/components/forms/apply-form';
import { formTicket } from '@/server/antispam';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/partners/apply'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'apply' });
  return buildMetadata({ title: t('title'), description: t('intro'), path: '/partners/apply', locale: locale as Locale });
}

export default async function ApplyPage({ params }: PageProps<'/[locale]/partners/apply'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('apply');
  const benefits = t.raw('benefits') as string[];
  return (
    <Container className="grid gap-12 py-12 md:py-16 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
      <div>
        <span className="blade" aria-hidden />
        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[2.75rem]">{t('title')}</h1>
        <p className="mt-4 max-w-[52ch] text-lg text-graphite">{t('intro')}</p>
        <ul className="mt-8 space-y-3">
          {benefits.map((b) => (
            <li key={b} className="flex gap-3 border-t border-line pt-3 font-medium"><span aria-hidden className="mt-2.5 h-1.5 w-4 shrink-0 -skew-x-[24deg] bg-spark" />{b}</li>
          ))}
        </ul>
      </div>
      <div className="relative">
        <ApplyForm ticket={formTicket()} />
      </div>
    </Container>
  );
}
