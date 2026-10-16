import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, ConfirmSubmit, Submit } from '@/components/admin/forms';
import { TextField } from '@/components/ui/field';
import { partnerStatusAction, updatePartnerAction } from '@/server/actions/admin/b2b';
import { formatDate } from '@/lib/format';

export default async function PartnerDetail({ params }: PageProps<'/admin/partners/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const p = await db.b2BPartner.findUnique({ where: { id }, include: { user: { include: { sessions: { select: { id: true } } } }, application: true } });
  if (!p) notFound();
  const suspended = p.status === 'SUSPENDED';
  return (
    <>
      <PageHead title={p.companyName} desc={<span className="flex gap-2">{suspended ? <Badge tone="danger">შეჩერებული</Badge> : <Badge tone="ok">აქტიური</Badge>}<Badge>{p.user.status}</Badge></span>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">პროფილი</h2>
          <ActionForm action={updatePartnerAction} className="space-y-3">
            <input type="hidden" name="id" value={p.id} />
            <TextField label="კომპანია" name="companyName" defaultValue={p.companyName} required />
            <p className="text-sm"><span className="text-mute">ს/კ:</span> <strong>{p.companyCode}</strong> · <span className="text-mute">ელფოსტა:</span> <strong>{p.user.email}</strong></p>
            <TextField label="საკონტაქტო პირი" name="contactName" defaultValue={p.contactName} required />
            <TextField label="ტელეფონი" name="phone" defaultValue={p.phone} required />
            <TextField label="მისამართი" name="address" defaultValue={p.address ?? ''} />
            <Submit size="sm">შენახვა</Submit>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">წვდომა</h2>
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-mute">შეიქმნა</dt><dd>{formatDate(p.createdAt)}</dd>
            <dt className="text-mute">ბოლო შესვლა</dt><dd>{p.user.lastLoginAt ? formatDate(p.user.lastLoginAt) : '—'}</dd>
            <dt className="text-mute">აქტიური სესიები</dt><dd>{p.user.sessions.length}</dd>
            {p.suspendReason && <><dt className="text-mute">შეჩერების მიზეზი</dt><dd>{p.suspendReason}</dd></>}
            {p.application && <><dt className="text-mute">განაცხადი</dt><dd><Link className="underline" href={`/admin/applications/${p.application.id}`}>ნახვა</Link></dd></>}
          </dl>
          <ActionForm action={partnerStatusAction} className="space-y-3" okText="შესრულდა.">
            <input type="hidden" name="id" value={p.id} />
            {suspended ? (
              <ConfirmSubmit label="აღდგენა" variant="primary" title="პარტნიორის აღდგენა" body="პარტნიორი კვლავ დაინახავს საბითუმო ფასებს." name="op" value="reactivate" confirmLabel="აღდგენა" />
            ) : (
              <>
                <TextField label="შეჩერების მიზეზი (შიდა)" name="reason" />
                <ConfirmSubmit label="შეჩერება" title="პარტნიორის შეჩერება" body="მყისიერად გაუქმდება ყველა სესია და ფასებზე წვდომა." name="op" value="suspend" confirmLabel="შეჩერება" />
              </>
            )}
            {p.user.status === 'PENDING_SETUP' && !suspended && <div><Submit size="sm" variant="secondary" name="op" value="resend">პაროლის ბმულის ხელახლა გაგზავნა</Submit></div>}
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
