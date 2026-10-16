import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { LText } from '@/lib/page-builder/registry';
import type { RenderSection } from '@/server/services/content';
import { mediaMap } from '@/server/services/content';
import { listPublicCategories, listPublicProducts, type Locale } from '@/server/services/catalog';
import { getPricesForViewer } from '@/server/services/pricing';
import { sanitizeRichText } from '@/lib/sanitize';
import { safeHref } from '@/lib/urls';
import { Container } from '../ui/container';
import { ProductCard, ProductGrid } from '../site/product-card';
import { buttonClass } from '../ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

type Ctx = { locale: Locale; media: Awaited<ReturnType<typeof mediaMap>>; first: boolean };
type D = Record<string, unknown>;

/** English is used only if the section's translation is APPROVED; otherwise Georgian. */
const pick = (l: unknown, s: RenderSection, locale: Locale) => {
  const v = (l ?? { ka: '', en: '' }) as LText;
  return locale === 'en' && s.enApproved && v.en?.trim() ? v.en : v.ka;
};

function collectMediaIds(sections: RenderSection[]) {
  const ids: string[] = [];
  for (const s of sections) {
    const d = s.data as D;
    if (typeof d.imageId === 'string') ids.push(d.imageId);
    if (Array.isArray(d.items)) for (const it of d.items as D[]) if (typeof it.imageId === 'string') ids.push(it.imageId);
  }
  return ids;
}

/** Internal links get locale-aware Link; external go through safeHref. */
function SmartLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const h = safeHref(href, '');
  if (!h) return null;
  if (h.startsWith('/') && !/^\/(ka|en)(\/|$)/.test(h)) return <Link href={h} className={className}>{children}</Link>;
  const external = /^https?:/.test(h);
  return <a href={h} className={className} {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>{children}</a>;
}

export async function RenderSections({ sections, locale }: { sections: RenderSection[]; locale: Locale }) {
  const media = await mediaMap(collectMediaIds(sections));
  return (
    <>
      {sections.map((s, i) => (
        <Section key={s.id} s={s} ctx={{ locale, media, first: i === 0 }} />
      ))}
    </>
  );
}

async function Section({ s, ctx }: { s: RenderSection; ctx: Ctx }) {
  const d = s.data as D;
  const T = (k: string) => pick(d[k], s, ctx.locale);
  switch (s.type) {
    case 'Hero': {
      const img = ctx.media.get(String(d.imageId ?? ''));
      return (
        <section className="relative overflow-hidden border-b border-line">
          <Container className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-20 lg:py-24">
            <div>
              {T('eyebrow') && (
                <p className="mb-5 flex items-center gap-3 text-sm font-semibold text-graphite">
                  <span className="blade" aria-hidden />
                  {T('eyebrow')}
                </p>
              )}
              {ctx.first ? (
                <h1 className="text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[3.5rem] lg:text-[4.5rem]">{T('heading')}</h1>
              ) : (
                <h2 className="text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-[3rem]">{T('heading')}</h2>
              )}
              {T('subheading') && <p className="mt-6 max-w-[46ch] text-lg text-graphite">{T('subheading')}</p>}
              <div className="mt-9 flex flex-wrap gap-3">
                {T('ctaLabel') && <SmartLink href={String(d.ctaHref ?? '')} className={buttonClass('primary', 'lg')}>{T('ctaLabel')}</SmartLink>}
                {T('secondaryLabel') && <SmartLink href={String(d.secondaryHref ?? '')} className={buttonClass('secondary', 'lg')}>{T('secondaryLabel')}</SmartLink>}
              </div>
            </div>
            <div className="relative aspect-[4/3.4] border border-line bg-paper">
              {img ? (
                <Image src={img.url} alt={(ctx.locale === 'en' ? img.altEn : img.alt) ?? ''} fill priority={ctx.first} sizes="(min-width:768px) 45vw, 100vw" className="object-contain p-8" />
              ) : (
                <div className="absolute inset-0 flex items-end p-6"><span className="blade" aria-hidden /></div>
              )}
              <span aria-hidden className="absolute -left-3 bottom-10 h-3 w-28 -skew-x-[24deg] bg-spark" />
            </div>
          </Container>
        </section>
      );
    }
    case 'RichText':
      return (
        <section>
          <Container className="py-14">
            {T('heading') && <h2 className="mb-6 text-2xl font-bold tracking-tight">{T('heading')}</h2>}
            <div className="prose-aspor text-[1.0625rem] text-graphite" dangerouslySetInnerHTML={{ __html: sanitizeRichText(T('body')) }} />
          </Container>
        </section>
      );
    case 'CategoryGrid':
      return <CategoryGrid heading={T('heading')} intro={T('intro')} locale={ctx.locale} />;
    case 'FeaturedProducts':
      return <Featured heading={T('heading')} intro={T('intro')} limit={Number(d.limit ?? 8)} locale={ctx.locale} />;
    case 'ImageTextSplit': {
      const img = ctx.media.get(String(d.imageId ?? ''));
      const right = d.imageSide !== 'left';
      return (
        <section>
          <Container className="grid items-center gap-10 py-16 md:grid-cols-2">
            <div className={cn('relative aspect-[4/3] bg-studio', !right && 'md:order-first', right && 'md:order-last')}>
              {img && <Image src={img.url} alt={(ctx.locale === 'en' ? img.altEn : img.alt) ?? ''} fill sizes="(min-width:768px) 50vw, 100vw" className="object-contain p-8" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{T('heading')}</h2>
              <p className="mt-4 max-w-[60ch] whitespace-pre-line text-graphite">{T('body')}</p>
              {T('ctaLabel') && <SmartLink href={String(d.ctaHref ?? '')} className={cn(buttonClass('secondary'), 'mt-7')}>{T('ctaLabel')}</SmartLink>}
            </div>
          </Container>
        </section>
      );
    }
    case 'BrandStory': {
      const stats = (Array.isArray(d.stats) ? d.stats : []) as D[];
      return (
        <section className="bg-studio">
          <Container className="grid gap-12 py-20 lg:grid-cols-[1fr_1.3fr]">
            <div>
              {T('eyebrow') && <p className="mb-4 flex items-center gap-3 text-sm font-semibold text-graphite"><span className="blade" aria-hidden />{T('eyebrow')}</p>}
              <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[2.75rem]">{T('heading')}</h2>
            </div>
            <div>
              <p className="max-w-[62ch] whitespace-pre-line text-lg leading-relaxed text-graphite">{T('body')}</p>
              {stats.length > 0 && (
                <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                  {stats.map((st, i) => (
                    <div key={i} className="border-t-2 border-ink pt-3">
                      <dt className="text-sm text-graphite">{pick(st.label, s, ctx.locale)}</dt>
                      <dd className="order-first text-2xl font-extrabold tabular-nums">{String(st.value ?? '')}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Container>
        </section>
      );
    }
    case 'CTA':
      return (
        <section className="bg-ink text-paper">
          <Container className="flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{T('heading')}</h2>
              {T('body') && <p className="mt-3 max-w-[56ch] text-[#c9c8c8]">{T('body')}</p>}
            </div>
            {T('buttonLabel') && <SmartLink href={String(d.buttonHref ?? '')} className={cn(buttonClass('spark', 'lg'), 'shrink-0 whitespace-nowrap')}>{T('buttonLabel')}</SmartLink>}
          </Container>
        </section>
      );
    case 'LogoStrip': {
      const items = (Array.isArray(d.items) ? d.items : []) as D[];
      return (
        <section>
          <Container className="py-14">
            {T('heading') && <h2 className="mb-8 text-center text-sm font-semibold text-graphite">{T('heading')}</h2>}
            <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {items.map((it, i) => {
                const img = ctx.media.get(String(it.imageId ?? ''));
                return (
                  <li key={i} className="text-lg font-bold text-graphite">
                    {img ? <Image src={img.url} alt={String(it.name ?? '')} width={140} height={48} className="h-10 w-auto object-contain grayscale" /> : String(it.name ?? '')}
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      );
    }
    case 'FAQ': {
      const items = (Array.isArray(d.items) ? d.items : []) as D[];
      return (
        <section>
          <Container className="max-w-3xl py-16">
            <h2 className="mb-8 text-2xl font-bold tracking-tight">{T('heading')}</h2>
            <div className="divide-y divide-line border-y border-line">
              {items.map((it, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {pick(it.q, s, ctx.locale)}
                    <span aria-hidden className="text-xl transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 whitespace-pre-line text-graphite">{pick(it.a, s, ctx.locale)}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      );
    }
    default:
      return null;
  }
}

async function CategoryGrid({ heading, intro, locale }: { heading: string; intro: string; locale: Locale }) {
  const t = await getTranslations('catalog');
  const cats = await listPublicCategories(locale);
  return (
    <section>
      <Container className="py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading || t('categories')}</h2>
            {intro && <p className="mt-2 max-w-[60ch] text-graphite">{intro}</p>}
          </div>
          <Link href="/products" className="text-sm font-semibold underline underline-offset-4">{t('viewAll')}</Link>
        </div>
        <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          {cats.map((c) => (
            <li key={c.id} className="bg-paper">
              <Link href={`/categories/${c.slug}`} className="group flex h-full min-h-40 flex-col justify-between p-5 hover:bg-studio">
                <span className="text-lg font-bold leading-tight">{c.name}</span>
                <span className="mt-6 flex items-center justify-between text-sm text-graphite">
                  {t('productsCount', { count: c.count })}
                  <span aria-hidden className="h-1.5 w-8 -skew-x-[24deg] bg-line transition-colors group-hover:bg-spark" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

async function Featured({ heading, intro, limit, locale }: { heading: string; intro: string; limit: number; locale: Locale }) {
  const t = await getTranslations('catalog');
  let { items } = await listPublicProducts({ locale, featured: true, limit });
  if (items.length < limit) {
    const more = await listPublicProducts({ locale, limit });
    items = [...items, ...more.items.filter((m) => !items.some((x) => x.id === m.id))].slice(0, limit);
  }
  if (!items.length) return null;
  const prices = await getPricesForViewer(items.map((p) => p.id));
  return (
    <section>
      <Container className="py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
            {intro && <p className="mt-2 max-w-[60ch] text-graphite">{intro}</p>}
          </div>
          <Link href="/products" className="text-sm font-semibold underline underline-offset-4">{t('viewAll')}</Link>
        </div>
        <ProductGrid>
          {items.map((p) => (
            <ProductCard key={p.id} p={p} price={prices ? prices.get(p.id) ?? null : undefined} />
          ))}
        </ProductGrid>
      </Container>
    </section>
  );
}
