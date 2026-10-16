import { requireAdmin } from '@/server/auth/guards';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { EnglishPanel, ImageUpload, ProductForm } from '@/components/admin/product-form';
import { ConfirmSubmit } from '@/components/admin/forms';
import { Notice } from '@/components/ui/field';
import { productImageAction, setHiddenAction, setProductStatusAction } from '@/server/actions/admin/catalog';
import { translationConfig } from '@/server/services/translation';

export default async function EditProduct({ params, searchParams }: PageProps<'/admin/products/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const sp = await searchParams;
  const p = await db.product.findUnique({ where: { id }, include: { translations: true, price: true, attributes: { orderBy: { sortOrder: 'asc' } }, images: { orderBy: { sortOrder: 'asc' }, include: { asset: true } } } });
  if (!p) notFound();
  const cats = await db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { translations: { where: { locale: 'ka' } } } });
  const ka = p.translations.find((t) => t.locale === 'ka');
  const en = p.translations.find((t) => t.locale === 'en');
  const canPublish = !!ka?.name;
  return (
    <>
      <PageHead
        title={`${p.sku} — ${ka?.name ?? ''}`}
        desc={<span className="flex flex-wrap gap-2">{p.status === 'PUBLISHED' ? <Badge tone="ok">გამოქვეყნებული</Badge> : <Badge>დრაფტი</Badge>}{p.isHidden && <Badge tone="warn">დამალული: {p.hiddenReason}</Badge>}{en?.status === 'APPROVED' ? <Badge tone="ok">EN ✓</Badge> : <Badge tone="warn">EN: {en?.status ?? 'NONE'}</Badge>}</span>}
        actions={
          <>
            {p.status === 'PUBLISHED' && !p.isHidden && <a className="text-sm font-semibold underline" target="_blank" rel="noreferrer" href={`/ka/products/${p.slug}`}>საიტზე ნახვა</a>}
            <form action={setProductStatusAction} className="flex gap-2">
              <input type="hidden" name="id" value={p.id} />
              {p.status === 'DRAFT' ? (
                canPublish && <ConfirmSubmit label="განხილულია — გამოქვეყნება" title="პროდუქტის გამოქვეყნება" body={<>შეამოწმეთ: დასახელება, კატეგორია, მახასიათებლები და სურათები. {p.images.length === 0 && <strong>სურათი არ არის დამატებული.</strong>}</>} name="status" value="PUBLISHED" variant="primary" confirmLabel="გამოქვეყნება" />
              ) : (
                <ConfirmSubmit label="დრაფტად გადაყვანა" title="საჯაროდან მოხსნა" body="პროდუქტი საიტზე აღარ გამოჩნდება." name="status" value="DRAFT" />
              )}
            </form>
            <form action={setHiddenAction}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="hidden" value={p.isHidden ? '0' : '1'} />
              <button className="h-9 rounded-[3px] px-3 text-sm font-semibold hover:bg-paper">{p.isHidden ? 'დამალვის მოხსნა' : 'დამალვა'}</button>
            </form>
          </>
        }
      />
      {sp.created && <div className="mb-4"><Notice tone="ok">პროდუქტი შეიქმნა (დრაფტი).</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="mb-4 font-bold">ძირითადი (ქართული)</h2>
          <ProductForm
            cats={cats.map((c) => ({ id: c.id, name: c.translations[0]?.name ?? c.slug }))}
            p={{ id: p.id, sku: p.sku, slug: p.slug, categoryId: p.categoryId, nameKa: ka?.name ?? '', descriptionKa: ka?.description ?? '', seoTitleKa: ka?.seoTitle ?? '', seoDescKa: ka?.seoDesc ?? '', color: p.color ?? '', modelNumber: p.modelNumber ?? '', featured: p.featured, sortOrder: p.sortOrder, price: p.price ? p.price.amountGel.toFixed(2) : '', specs: p.attributes.map((a) => `${a.labelKa}: ${a.value}`).join('\n') }}
          />
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-bold">სურათები</h2>
            <ul className="mb-4 space-y-3">
              {p.images.map((im, i) => (
                <li key={im.id} className="flex gap-3 border-b border-line pb-3">
                  <Image src={im.asset.url} alt={im.altKa ?? ''} width={72} height={72} className="size-18 shrink-0 border border-line object-contain" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <form action={productImageAction} className="flex flex-wrap gap-2">
                      <input type="hidden" name="imageId" value={im.id} />
                      <input type="hidden" name="op" value="alt" />
                      <input name="altKa" defaultValue={im.altKa ?? ''} placeholder="alt (ქართ.)" aria-label="alt ქართ." className="h-8 min-w-0 flex-1 rounded-[3px] border border-line px-2 text-xs" />
                      <input name="altEn" defaultValue={im.altEn ?? ''} placeholder="alt (EN)" aria-label="alt EN" className="h-8 min-w-0 flex-1 rounded-[3px] border border-line px-2 text-xs" />
                      <button className="text-xs font-semibold underline">შენახვა</button>
                    </form>
                    <div className="flex gap-3 text-xs font-semibold">
                      {(['up', 'down', 'remove'] as const).map((op) => (
                        <form key={op} action={productImageAction}>
                          <input type="hidden" name="imageId" value={im.id} />
                          <input type="hidden" name="op" value={op} />
                          <button disabled={(op === 'up' && i === 0) || (op === 'down' && i === p.images.length - 1)} className="underline disabled:opacity-30">{{ up: '↑ ზემოთ', down: '↓ ქვემოთ', remove: 'წაშლა' }[op]}</button>
                        </form>
                      ))}
                      {i === 0 && <Badge tone="dark">მთავარი</Badge>}
                    </div>
                  </div>
                </li>
              ))}
              {p.images.length === 0 && <li className="text-sm text-mute">სურათი არ არის.</li>}
            </ul>
            <ImageUpload productId={p.id} />
          </Card>
          <Card>
            <h2 className="mb-1 font-bold">ინგლისური ვერსია</h2>
            <p className="mb-4 text-xs text-mute">საჯაროდ ჩანს მხოლოდ სტატუსით APPROVED. სხვა შემთხვევაში /en გვერდზე ჩანს ქართული ტექსტი და გვერდი noindex-ია.</p>
            <EnglishPanel
              id={p.id}
              enabled={translationConfig().enabled}
              en={{
                nameKa: ka?.name ?? '', descriptionKa: ka?.description ?? '', seoTitleKa: ka?.seoTitle ?? '', seoDescKa: ka?.seoDesc ?? '',
                name: en?.name ?? '', description: en?.description ?? '', seoTitle: en?.seoTitle ?? '', seoDesc: en?.seoDesc ?? '', status: en?.status ?? '', source: en?.source ?? '',
                attrs: p.attributes.map((a) => ({ id: a.id, labelKa: a.labelKa, value: a.value, labelEn: a.labelEn ?? '', valueEn: a.valueEn ?? '' })),
              }}
            />
          </Card>
          <p className="text-xs text-mute">ID: {p.id} · განახლდა: {p.updatedAt.toISOString()} · <Link className="underline" href={`/admin/audit?entity=${p.id}`}>ისტორია</Link></p>
        </div>
      </div>
    </>
  );
}
