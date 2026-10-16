import { requireAdmin } from '@/server/auth/guards';
import Image from 'next/image';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, ConfirmSubmit, Submit } from '@/components/admin/forms';
import { Checkbox, SelectField, TextField } from '@/components/ui/field';
import { deleteBannerAction, saveBannerAction } from '@/server/actions/admin/content';

export const metadata = { title: 'ბანერები' };

export default async function Banners() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const [banners, media] = await Promise.all([db.banner.findMany({ orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }], include: { image: true } }), db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })]);
  return (
    <>
      <PageHead title="ბანერები" desc="ბანერის სურათი, ტექსტი და ბმული რედაქტირებადია. მთავარი გვერდის Hero სექცია იმართება გვერდების რედაქტორიდან." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-bold">+ ახალი ბანერი</h2><BannerForm media={media} /></Card>
        {banners.map((b) => (
          <Card key={b.id}>
            <div className="mb-3 flex items-center gap-3">{b.image && <Image src={b.image.url} alt="" width={64} height={40} className="h-10 w-16 object-contain" />}<h2 className="font-bold">{b.titleKa}</h2><Badge tone={b.enStatus === 'APPROVED' ? 'ok' : 'warn'}>EN {b.enStatus}</Badge></div>
            <BannerForm b={b} media={media} />
            <form action={deleteBannerAction} className="mt-2"><input type="hidden" name="id" value={b.id} /><ConfirmSubmit label="წაშლა" title="ბანერის წაშლა" body="ბანერი წაიშლება." confirmLabel="წაშლა" /></form>
          </Card>
        ))}
      </div>
    </>
  );
}

type B = { id: string; titleKa: string; titleEn: string | null; textKa: string | null; textEn: string | null; linkUrl: string | null; placement: string; imageId: string | null; sortOrder: number; isActive: boolean };
type M = { id: string; originalName: string | null };

function BannerForm({ b, media }: { b?: B; media: M[] }) {
  return (
    <ActionForm action={saveBannerAction} className="space-y-3" resetOnOk={!b}>
      <input type="hidden" name="id" value={b?.id ?? ''} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="სათაური (ქართ.)" name="titleKa" defaultValue={b?.titleKa} required />
        <TextField label="Title (EN)" name="titleEn" defaultValue={b?.titleEn ?? ''} />
        <TextField label="ტექსტი (ქართ.)" name="textKa" defaultValue={b?.textKa ?? ''} />
        <TextField label="Text (EN)" name="textEn" defaultValue={b?.textEn ?? ''} />
        <TextField label="ბმული (/ka/products ან https://)" name="linkUrl" defaultValue={b?.linkUrl ?? ''} />
        <TextField label="განთავსება" name="placement" defaultValue={b?.placement ?? 'home'} required />
        <SelectField label="სურათი" name="imageId" defaultValue={b?.imageId ?? ''}><option value="">— არა —</option>{media.map((m) => <option key={m.id} value={m.id}>{m.originalName ?? m.id}</option>)}</SelectField>
        <TextField label="რიგი" name="sortOrder" type="number" defaultValue={String(b?.sortOrder ?? 0)} />
      </div>
      <Checkbox name="isActive" label="აქტიური" defaultChecked={b?.isActive ?? true} />
      <div className="flex gap-2"><Submit size="sm" variant="secondary" name="enIntent" value="save">შენახვა</Submit><Submit size="sm" name="enIntent" value="approve">შენახვა + EN დამტკიცება</Submit></div>
    </ActionForm>
  );
}
