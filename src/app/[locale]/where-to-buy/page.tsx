import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { listActiveStores } from '@/server/services/content';
import { buildMetadata } from '@/lib/seo';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { Locale } from '@/server/services/catalog';

export async function generateMetadata({ params }: PageProps<'/[locale]/where-to-buy'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'stores' });
  return buildMetadata({ title: t('title'), description: t('intro'), path: '/where-to-buy', locale: locale as Locale });
}

export default async function WhereToBuy({ params, searchParams }: PageProps<'/[locale]/where-to-buy'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('stores');
  const sp = await searchParams;
  const stores = await listActiveStores(locale as Locale);
  const cities = [...new Set(stores.map((s) => s.city))];
  const city = typeof sp.city === 'string' && cities.includes(sp.city) ? sp.city : null;
  const shown = city ? stores.filter((s) => s.city === city) : stores;
  const grouped = cities.filter((c) => !city || c === city).map((c) => ({ city: c, items: shown.filter((s) => s.city === c) }));
  return (
    <Container className="py-12 md:py-16">
      <h1 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-[2.75rem]">{t('title')}</h1>
      <p className="mt-3 max-w-[60ch] text-graphite">{t('intro')}</p>
      {cities.length > 1 && (
        <nav aria-label={t('filterCity')} className="mt-8 flex flex-wrap gap-2">
          <Link href="/where-to-buy" aria-current={!city ? 'page' : undefined} className={cn('inline-flex h-10 items-center rounded-[3px] border px-4 text-sm font-semibold', !city ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink')}>{t('allCities')}</Link>
          {cities.map((c) => (
            <Link key={c} href={{ pathname: '/where-to-buy', query: { city: c } }} aria-current={city === c ? 'page' : undefined} className={cn('inline-flex h-10 items-center rounded-[3px] border px-4 text-sm font-semibold', city === c ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink')}>{c}</Link>
          ))}
        </nav>
      )}
      {stores.length === 0 ? (
        <p className="mt-12 border border-dashed border-line px-6 py-14 text-center text-graphite">{t('empty')}</p>
      ) : (
        <div className="mt-10 space-y-12">
          {grouped.map((g) => (
            <section key={g.city}>
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold"><span className="blade" aria-hidden />{g.city}</h2>
              <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((s) => (
                  <li key={s.id} className="bg-paper p-5">
                    <h3 className="font-bold">{s.name}</h3>
                    <p className="mt-1 text-sm text-graphite">{s.address}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
                      {s.phone && <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="underline underline-offset-4">{s.phone}</a>}
                      {s.mapUrl && /^https:\/\//.test(s.mapUrl) && <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t('map')}</a>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
