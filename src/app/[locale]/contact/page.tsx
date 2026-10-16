import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { ContactForm } from '@/components/forms/contact-form';
import { formTicket } from '@/server/antispam';
import { getSettings } from '@/server/services/content';
import { buildMetadata } from '@/lib/seo';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/contact'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return buildMetadata({ title: t('title'), description: t('intro'), path: '/contact', locale: locale as Locale });
}

export default async function ContactPage({ params }: PageProps<'/[locale]/contact'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('contact');
  const s = await getSettings(['contact.email', 'contact.phone', 'contact.address', 'contact.hours'], locale as Locale);
  return (
    <Container className="grid gap-12 py-12 md:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-[2.75rem]">{t('title')}</h1>
        <p className="mt-3 text-graphite">{t('intro')}</p>
        {Object.keys(s).length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-sm font-bold">{t('details')}</h2>
            <address className="space-y-2 not-italic">
              {s['contact.address'] && <p>{s['contact.address']}</p>}
              {s['contact.phone'] && <p><a href={`tel:${s['contact.phone'].replace(/\s/g, '')}`} className="font-semibold underline underline-offset-4">{s['contact.phone']}</a></p>}
              {s['contact.email'] && <p><a href={`mailto:${s['contact.email']}`} className="font-semibold underline underline-offset-4">{s['contact.email']}</a></p>}
              {s['contact.hours'] && <p className="text-graphite">{s['contact.hours']}</p>}
            </address>
          </section>
        )}
      </div>
      <div className="relative"><ContactForm ticket={formTicket()} /></div>
    </Container>
  );
}
