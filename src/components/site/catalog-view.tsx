import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '../ui/container';
import { ProductCard, ProductGrid } from './product-card';
import { listPublicCategories, listPublicProducts, type Locale } from '@/server/services/catalog';
import { getPricesForViewer } from '@/server/services/pricing';
import { getActivePartner } from '@/server/auth/guards';
import { PartnerPriceCta } from './price';
import { cn } from '@/lib/cn';

export async function CatalogView({ locale, q, category, page, title, intro, basePath }: { locale: Locale; q?: string; category?: string; page: number; title: string; intro?: string | null; basePath: string }) {
  const t = await getTranslations('catalog');
  const [cats, result, partner] = await Promise.all([listPublicCategories(locale), listPublicProducts({ locale, q, category, page }), getActivePartner()]);
  const prices = await getPricesForViewer(result.items.map((p) => p.id));
  const qs = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <Container className="py-12 md:py-16">
      <header className="mb-10 grid gap-6 md:grid-cols-[1fr_minmax(280px,420px)] md:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.02em] sm:text-[2.75rem]">{title}</h1>
          {intro && <p className="mt-3 max-w-[60ch] text-graphite">{intro}</p>}
        </div>
        <form role="search" action={`/${locale}${basePath}`} method="get" className="flex gap-2">
          <label htmlFor="q" className="sr-only">{t('searchLabel')}</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder={t('searchPlaceholder')} maxLength={100} className="h-11 w-full rounded-[3px] border border-line px-3 focus-visible:border-ink" />
          <button className="h-11 shrink-0 rounded-[3px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-graphite">{t('search')}</button>
        </form>
      </header>

      <nav aria-label={t('categories')} className="-mx-4 mb-8 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-2">
          <li><CatChip href={q ? `/products?q=${encodeURIComponent(q)}` : '/products'} active={!category}>{t('all')}</CatChip></li>
          {cats.map((c) => (
            <li key={c.id}><CatChip href={`/categories/${c.slug}${q ? `?q=${encodeURIComponent(q)}` : ''}`} active={category === c.slug}>{c.name}</CatChip></li>
          ))}
        </ul>
      </nav>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite" aria-live="polite">{t('results', { count: result.total })}</p>
      </div>
      {!partner && result.total > 0 && <div className="mb-6"><PartnerPriceCta /></div>}

      {result.items.length === 0 ? (
        <div className="border border-dashed border-line px-6 py-16 text-center">
          <p className="font-semibold">{t('empty')}</p>
          <p className="mt-1 text-sm text-graphite">{t('emptyHint')}</p>
          <Link href="/products" className="mt-5 inline-block text-sm font-semibold underline underline-offset-4">{t('clear')}</Link>
        </div>
      ) : (
        <ProductGrid>
          {result.items.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 4} price={prices ? prices.get(p.id) ?? null : undefined} />
          ))}
        </ProductGrid>
      )}

      {result.pageCount > 1 && (
        <nav aria-label={t('pagination')} className="mt-10 flex items-center justify-between gap-4">
          {result.page > 1 ? <Link href={qs(result.page - 1)} rel="prev" className="text-sm font-semibold underline underline-offset-4">{t('prev')}</Link> : <span />}
          <span className="text-sm text-graphite">{t('page', { page: result.page, count: result.pageCount })}</span>
          {result.page < result.pageCount ? <Link href={qs(result.page + 1)} rel="next" className="text-sm font-semibold underline underline-offset-4">{t('next')}</Link> : <span />}
        </nav>
      )}
    </Container>
  );
}

function CatChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={cn('inline-flex h-10 items-center rounded-[3px] border px-4 text-sm font-semibold', active ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink')}>
      {children}
    </Link>
  );
}
