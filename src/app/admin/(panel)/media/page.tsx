import { requireAdmin } from '@/server/auth/guards';
import Image from 'next/image';
import { db } from '@/lib/db';
import { Card, PageHead } from '@/components/admin/shell';
import { ActionForm, ConfirmSubmit, Submit } from '@/components/admin/forms';
import { deleteMediaAction, mediaAltAction, uploadMediaAction } from '@/server/actions/admin/content';

export const metadata = { title: 'მედია' };

export default async function Media() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const items = await db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 300, include: { _count: { select: { productImages: true, banners: true, categories: true } } } });
  return (
    <>
      <PageHead title="მედია ბიბლიოთეკა" desc="ფაილი მოწმდება შიგთავსით (არა გაფართოებით), გადაკოდირდება WebP-ში, მეტამონაცემები იშლება. SVG არ დაიშვება. მაქს. 4MB." />
      <Card className="mb-6">
        <ActionForm action={uploadMediaAction} className="flex flex-wrap items-end gap-3" okText="აიტვირთა." resetOnOk>
          <div><label htmlFor="mfiles" className="block text-sm font-semibold">სურათები</label><input id="mfiles" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 text-sm" /></div>
          <div><label htmlFor="altKa" className="block text-sm font-semibold">alt ტექსტი (ქართ.)</label><input id="altKa" name="altKa" className="mt-1 h-10 rounded-[3px] border border-line px-2 text-sm" /></div>
          <Submit size="sm">ატვირთვა</Submit>
        </ActionForm>
      </Card>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((m) => {
          const used = m._count.productImages + m._count.banners + m._count.categories;
          return (
            <li key={m.id} className="rounded-[4px] border border-line bg-paper p-2 text-xs">
              <div className="relative aspect-square bg-paper"><Image src={m.url} alt={m.altKa ?? ''} fill sizes="200px" className="object-contain" /></div>
              <p className="mt-2 truncate font-semibold" title={m.originalName ?? ''}>{m.originalName}</p>
              <p className="text-mute">{m.width}×{m.height} · {Math.round(m.sizeBytes / 1024)}KB · ID <code className="select-all">{m.id}</code></p>
              <form action={mediaAltAction} className="mt-2 space-y-1">
                <input type="hidden" name="id" value={m.id} />
                <input name="altKa" defaultValue={m.altKa ?? ''} placeholder="alt ქართ." aria-label="alt ქართ." className="h-8 w-full rounded-[3px] border border-line px-1.5" />
                <input name="altEn" defaultValue={m.altEn ?? ''} placeholder="alt EN" aria-label="alt EN" className="h-8 w-full rounded-[3px] border border-line px-1.5" />
                <button className="font-semibold underline">alt შენახვა</button>
              </form>
              {used === 0 ? (
                <form action={deleteMediaAction} className="mt-1"><input type="hidden" name="id" value={m.id} /><ConfirmSubmit label="წაშლა" title="ფაილის წაშლა" body="ფაილი სამუდამოდ წაიშლება საცავიდან." confirmLabel="წაშლა" /></form>
              ) : (
                <p className="mt-1 text-mute">გამოყენებულია ({used})</p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
