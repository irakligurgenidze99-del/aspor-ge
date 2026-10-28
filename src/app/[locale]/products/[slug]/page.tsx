import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/container';
import { Gallery } from '@/components/site/gallery';
import { JsonLd } from '@/components/site/json-ld';
import { BuyBox } from '@/components/site/buy-box';
import { paymentsProvider, installmentEnabled } from '@/server/payments/config';
import { ProductCard, ProductGrid } from '@/components/site/product-card';
import { Notice } from '@/components/ui/field';
import { getPublicProduct, relatedProducts, type Locale } from '@/server/services/catalog';
import { getPricesForViewer } from '@/server/services/pricing';
import { buildMetadata, SITE_URL } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/products/[slug]'>) {
  const { locale, slug } = await params;
  const p = await getPublicProduct(slug, locale as Locale);
  if (!p) return {};
  // NOTE: metadata never includes price.
  const desc = p.seoDesc || p.description?.slice(0, 160) || `${p.name} — ${p.sku}`;
  return buildMetadata({ title: p.seoTitle || `${p.name} (${p.sku})`, description: desc, path: `/products/${slug}`, locale: locale as Locale, enIndexable: p.hasApprovedEn, image: p.images[0]?.url ?? null });
}

export default async function ProductPage({ params }: PageProps<'/[locale]/products/[slug]'>) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const L = locale as Locale;
  const p = await getPublicProduct(slug, L);
  if (!p) notFound();
  const t = await getTranslations('product');
  const nav = await getTranslations('nav');
  const related = await relatedProducts(p.categorySlug, p.id, L);
  const prices = await getPricesForViewer([p.id, ...related.map((r) => r.id)]);
  const price = prices ? prices.get(p.id) ?? null : undefined;
  const url = `${SITE_URL()}/${L}/products/${p.slug}`;

  return (
    <>
      {/* Product JSON-LD: public fields only. Offers carry the PUBLIC retail price only — never wholesale. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, ...(p.modelNumber ? { mpn: p.modelNumber } : {}),
          brand: { '@type': 'Brand', name: 'ASPOR' }, category: p.categoryName, url,
          ...(p.color ? { color: p.color } : {}), ...(p.description ? { description: p.description } : {}),
          image: p.images.map((i) => (i.url.startsWith('http') ? i.url : `${SITE_URL()}${i.url}`)),
          ...(p.retailGel ? { offers: { '@type': 'Offer', priceCurrency: 'GEL', price: p.retailGel, url } } : {}),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: nav('products'), item: `${SITE_URL()}/${L}/products` },
            { '@type': 'ListItem', position: 2, name: p.categoryName, item: `${SITE_URL()}/${L}/categories/${p.categorySlug}` },
            { '@type': 'ListItem', position: 3, name: p.name, item: url },
          ],
        }}
      />
      <Container className="py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-graphite">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/products" className="hover:text-ink">{nav('products')}</Link></li>
            <li aria-hidden>/</li>
            <li><Link href={`/categories/${p.categorySlug}`} className="hover:text-ink">{p.categoryName}</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">{p.sku}</li>
          </ol>
        </nav>
        {L === 'en' && p.fallback && <div className="mb-6"><Notice tone="warn">{t('translationPending')}</Notice></div>}
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <Gallery images={p.images} name={p.name} labels={{ gallery: t('gallery'), image: t('image', { n: '{n}' }), noImage: t('noImage') }} />
          <div>
            <p className="text-sm font-semibold text-graphite">{p.categoryName}</p>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-0.02em] sm:text-[2rem]">{p.name}</h1>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div><dt className="text-mute">{t('sku')}</dt><dd className="font-semibold">{p.sku}</dd></div>
              {p.modelNumber && <div><dt className="text-mute">{t('model')}</dt><dd className="font-semibold">{p.modelNumber}</dd></div>}
              {p.color && <div><dt className="text-mute">{t('color')}</dt><dd className="font-semibold">{p.color}</dd></div>}
            </dl>
            <BuyBox slug={p.slug} retail={p.retailGel} wholesale={price} paymentsOn={!!paymentsProvider()} installmentOn={installmentEnabled()} />
            {p.description && (
              <section className="mt-8">
                <h2 className="text-lg font-bold">{t('description')}</h2>
                <p className="mt-2 whitespace-pre-line text-graphite">{p.description}</p>
              </section>
            )}
            {p.specs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold">{t('specs')}</h2>
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {p.specs.map((s, i) => (
                      <tr key={i} className="border-b border-line align-top">
                        <th scope="row" className="w-2/5 py-2.5 pr-4 text-left font-medium text-graphite">{s.label}</th>
                        <td className="py-2.5 font-medium">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="mb-6 text-2xl font-bold tracking-tight">{t('related')}</h2>
            <ProductGrid>
              {related.map((r) => <ProductCard key={r.id} p={r} price={prices ? prices.get(r.id) ?? null : undefined} />)}
            </ProductGrid>
          </section>
        )}
      </Container>
    </>
  );
}
