import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, ConfirmSubmit, Submit } from '@/components/admin/forms';
import { Checkbox, TextField } from '@/components/ui/field';
import { deleteStoreAction, saveStoreAction } from '@/server/actions/admin/b2b';

export const metadata = { title: 'მაღაზიები' };

type S = { id: string; nameKa: string; nameEn: string | null; city: string; cityEn: string | null; addressKa: string; addressEn: string | null; phone: string | null; mapUrl: string | null; sortOrder: number; isActive: boolean };

export default async function Stores() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const stores = await db.partnerStore.findMany({ orderBy: [{ city: 'asc' }, { sortOrder: 'asc' }] });
  return (
    <>
      <PageHead title="პარტნიორი მაღაზიები („სად ვიყიდო“)" desc="საჯარო ცნობარი — იმართება დამოუკიდებლად B2B ანგარიშებისგან." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-bold">+ ახალი მაღაზია</h2><StoreForm /></Card>
        {stores.map((s) => (
          <Card key={s.id}>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{s.nameKa} <span className="font-normal text-mute">· {s.city}</span></h2>{!s.isActive && <Badge>დამალული</Badge>}</div>
            <StoreForm s={s} />
            <form action={deleteStoreAction} className="mt-2">
              <input type="hidden" name="id" value={s.id} />
              <ConfirmSubmit label="წაშლა" title="მაღაზიის წაშლა" body={`„${s.nameKa}“ წაიშლება ცნობარიდან.`} confirmLabel="წაშლა" />
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}

function StoreForm({ s }: { s?: S }) {
  return (
    <ActionForm action={saveStoreAction} className="space-y-3" resetOnOk={!s}>
      <input type="hidden" name="id" value={s?.id ?? ''} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="დასახელება" name="nameKa" defaultValue={s?.nameKa} required />
        <TextField label="Name (EN)" name="nameEn" defaultValue={s?.nameEn ?? ''} />
        <TextField label="ქალაქი" name="city" defaultValue={s?.city} required />
        <TextField label="City (EN)" name="cityEn" defaultValue={s?.cityEn ?? ''} />
        <TextField label="მისამართი" name="addressKa" defaultValue={s?.addressKa} required />
        <TextField label="Address (EN)" name="addressEn" defaultValue={s?.addressEn ?? ''} />
        <TextField label="ტელეფონი" name="phone" defaultValue={s?.phone ?? ''} />
        <TextField label="რუკის ბმული (https)" name="mapUrl" defaultValue={s?.mapUrl ?? ''} />
      </div>
      <div className="flex items-end gap-4"><TextField label="რიგი" name="sortOrder" type="number" defaultValue={String(s?.sortOrder ?? 0)} className="w-24" /><Checkbox name="isActive" label="საჯაროდ ჩანს" defaultChecked={s?.isActive ?? true} /></div>
      <Submit size="sm">შენახვა</Submit>
    </ActionForm>
  );
}
