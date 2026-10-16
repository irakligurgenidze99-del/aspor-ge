/* eslint-disable @next/next/no-html-link-for-pages -- file downloads served by route handlers, not pages */
import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { Badge, PageHead, td, th } from '@/components/admin/shell';
import { buttonClass } from '@/components/ui/button';
import { bulkProductAction } from '@/server/actions/admin/catalog';
import { ConfirmSubmit } from '@/components/admin/forms';
import { formatGel } from '@/lib/format';

export const metadata = { title: 'პროდუქტები' };

export default async function Products({ searchParams }: PageProps<'/admin/products'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const status = sp.status === 'DRAFT' || sp.status === 'PUBLISHED' ? sp.status : undefined;
  const cat = typeof sp.category === 'string' ? sp.category : '';
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.hidden === '1' ? { isHidden: true } : {}),
    ...(sp.noprice === '1' ? { price: null } : {}),
    ...(cat ? { category: { slug: cat } } : {}),
    ...(q ? { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { translations: { some: { name: { contains: q, mode: 'insensitive' } } } }] } : {}),
  };
  const take = 50;
  const [total, items, cats] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip: (page - 1) * take, take, include: { translations: true, price: true, category: { include: { translations: { where: { locale: 'ka' } } } }, images: { take: 1, orderBy: { sortOrder: 'asc' }, include: { asset: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { translations: { where: { locale: 'ka' } } } }),
  ]);
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(cat ? { category: cat } : {}), page: String(p) })}`;
  return (
    <>
      <PageHead title="პროდუქტები" desc={`სულ ${total}. ყოველი ფერი — ცალკე SKU. გამოქვეყნება ხდება მხოლოდ განხილვის შემდეგ.`} actions={<><Link href="/admin/products/new" className={buttonClass('primary', 'sm')}>+ ახალი</Link><a href="/admin/api/export?format=xlsx" className={buttonClass('secondary', 'sm')}>ექსპორტი .xlsx</a></>} />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={q} placeholder="SKU ან დასახელება" className="h-9 w-56 rounded-[3px] border border-line px-2 text-sm" />
        <select name="status" defaultValue={status ?? ''} className="h-9 rounded-[3px] border border-line px-2 text-sm"><option value="">ყველა სტატუსი</option><option value="DRAFT">დრაფტი</option><option value="PUBLISHED">გამოქვეყნებული</option></select>
        <select name="category" defaultValue={cat} className="h-9 rounded-[3px] border border-line px-2 text-sm"><option value="">ყველა კატეგორია</option>{cats.map((c) => <option key={c.id} value={c.slug}>{c.translations[0]?.name ?? c.slug}</option>)}</select>
        <button className={buttonClass('secondary', 'sm')}>ფილტრი</button>
      </form>
      <form action={bulkProductAction} id="bulk">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-mute">მონიშნულები:</span>
          <ConfirmSubmit label="გამოქვეყნება" title="მონიშნული პროდუქტების გამოქვეყნება" body="დარწმუნდით, რომ თითოეული პროდუქტი განხილულია. გამოქვეყნებული პროდუქტები საჯაროდ გამოჩნდება." name="op" value="publish" variant="primary" confirmLabel="გამოქვეყნება" />
          <ConfirmSubmit label="დრაფტად გადაყვანა" title="საჯაროდან მოხსნა" body="მონიშნული პროდუქტები საჯაროდ აღარ გამოჩნდება." name="op" value="draft" />
          <ConfirmSubmit label="დამალულის გამოჩენა" title="დამალვის მოხსნა" body="მონიშნული პროდუქტები, თუ გამოქვეყნებულია, ისევ გამოჩნდება." name="op" value="unhide" variant="primary" />
        </div>
        <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-studio"><tr><th className={th}><span className="sr-only">მონიშვნა</span></th><th className={th}></th><th className={th}>SKU</th><th className={th}>დასახელება</th><th className={th}>კატეგორია</th><th className={th}>ფასი ₾</th><th className={th}>სტატუსი</th><th className={th}>EN</th></tr></thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => {
                const ka = p.translations.find((t) => t.locale === 'ka');
                const en = p.translations.find((t) => t.locale === 'en');
                return (
                  <tr key={p.id} className="hover:bg-studio/60">
                    <td className={td}><input type="checkbox" name="ids" value={p.id} aria-label={`მონიშვნა ${p.sku}`} className="size-4 accent-ink" /></td>
                    <td className={td}>{p.images[0] ? <Image src={p.images[0].asset.url} alt="" width={40} height={40} className="size-10 object-contain" /> : <span className="block size-10 bg-studio" />}</td>
                    <td className={`${td} font-semibold`}><Link className="underline" href={`/admin/products/${p.id}`}>{p.sku}</Link></td>
                    <td className={td}>{ka?.name}{p.color && <span className="text-mute"> · {p.color}</span>}</td>
                    <td className={td}>{p.category.translations[0]?.name}</td>
                    <td className={`${td} tabular-nums`}>{p.price ? formatGel(p.price.amountGel.toString()) : <span className="text-mute">—</span>}</td>
                    <td className={td}><div className="flex flex-wrap gap-1">{p.status === 'PUBLISHED' ? <Badge tone="ok">გამოქვ.</Badge> : <Badge>დრაფტი</Badge>}{p.isHidden && <Badge tone="warn">დამალული</Badge>}</div></td>
                    <td className={td}>{en ? <Badge tone={en.status === 'APPROVED' ? 'ok' : en.status === 'REJECTED' ? 'danger' : 'warn'}>{en.status}</Badge> : <span className="text-mute">—</span>}</td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-mute">პროდუქტი ვერ მოიძებნა.</td></tr>}
            </tbody>
          </table>
        </div>
      </form>
      {total > take && (
        <nav className="mt-4 flex gap-4 text-sm font-semibold">
          {page > 1 && <Link href={qs(page - 1)} className="underline">← წინა</Link>}
          <span className="text-mute">გვ. {page} / {Math.ceil(total / take)}</span>
          {page * take < total && <Link href={qs(page + 1)} className="underline">შემდეგი →</Link>}
        </nav>
      )}
    </>
  );
}
