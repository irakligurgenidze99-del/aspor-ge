import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, Submit } from '@/components/admin/forms';
import { TextField, Checkbox, TextArea } from '@/components/ui/field';
import { saveCategoryAction, translateCategoryAction } from '@/server/actions/admin/catalog';
import { translationConfig } from '@/server/services/translation';

export const metadata = { title: 'კატეგორიები' };

export default async function Categories() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const cats = await db.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { translations: true, _count: { select: { products: true } } } });
  const tr = translationConfig();
  return (
    <>
      <PageHead title="კატეგორიები" desc="slug ქმნის საჯარო URL-ს (/ka/categories/slug). EN სახელი საჯარო ხდება მხოლოდ დამტკიცების შემდეგ." />
      <div className="grid gap-4 lg:grid-cols-2">
        {cats.map((c) => {
          const ka = c.translations.find((t) => t.locale === 'ka');
          const en = c.translations.find((t) => t.locale === 'en');
          return (
            <Card key={c.id}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-bold">{ka?.name} <span className="font-normal text-mute">/{c.slug} · {c._count.products} პროდ.</span></h2>
                <div className="flex gap-1">{!c.isActive && <Badge>გამორთული</Badge>}<Badge tone={en?.status === 'APPROVED' ? 'ok' : 'warn'}>EN {en?.status ?? 'NONE'}</Badge></div>
              </div>
              <CatForm c={{ id: c.id, slug: c.slug, nameKa: ka?.name ?? '', descriptionKa: ka?.description ?? '', nameEn: en?.name ?? '', descriptionEn: en?.description ?? '', sortOrder: c.sortOrder, isActive: c.isActive }} />
              {tr.enabled && (
                <form action={translateCategoryAction} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs font-semibold underline">Claude-ით EN თარგმნა (განსახილველად)</button>
                </form>
              )}
            </Card>
          );
        })}
        <Card>
          <h2 className="mb-3 font-bold">+ ახალი კატეგორია</h2>
          <CatForm c={{ id: '', slug: '', nameKa: '', descriptionKa: '', nameEn: '', descriptionEn: '', sortOrder: 100, isActive: true }} />
        </Card>
      </div>
    </>
  );
}

function CatForm({ c }: { c: { id: string; slug: string; nameKa: string; descriptionKa: string; nameEn: string; descriptionEn: string; sortOrder: number; isActive: boolean } }) {
  return (
    <ActionForm action={saveCategoryAction} className="space-y-3">
      <input type="hidden" name="id" value={c.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="სახელი (ქართ.)" name="nameKa" defaultValue={c.nameKa} required />
        <TextField label="slug" name="slug" defaultValue={c.slug} />
      </div>
      <TextArea label="აღწერა (ქართ.)" name="descriptionKa" defaultValue={c.descriptionKa} rows={2} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name (EN)" name="nameEn" defaultValue={c.nameEn} />
        <TextField label="რიგითობა" name="sortOrder" type="number" defaultValue={String(c.sortOrder)} />
      </div>
      <TextArea label="Description (EN)" name="descriptionEn" defaultValue={c.descriptionEn} rows={2} />
      <Checkbox name="isActive" label="აქტიური (საჯაროდ ჩანს)" defaultChecked={c.isActive} />
      <div className="flex gap-2"><Submit size="sm" variant="secondary" name="enIntent" value="save">შენახვა</Submit><Submit size="sm" name="enIntent" value="approve">შენახვა + EN დამტკიცება</Submit></div>
    </ActionForm>
  );
}
