import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge, Card, PageHead } from '@/components/admin/shell';
import { ActionForm, ConfirmSubmit } from '@/components/admin/forms';
import { Notice, TextArea } from '@/components/ui/field';
import { reviewApplicationAction } from '@/server/actions/admin/b2b';
import { formatDate } from '@/lib/format';

export default async function ApplicationDetail({ params }: PageProps<'/admin/applications/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const a = await db.partnershipApplication.findUnique({ where: { id }, include: { partner: true } });
  if (!a) notFound();
  const [emailTaken, codeTaken, others] = await Promise.all([
    db.user.findUnique({ where: { email: a.email } }),
    db.b2BPartner.findUnique({ where: { companyCode: a.companyCode } }),
    db.partnershipApplication.findMany({ where: { id: { not: a.id }, OR: [{ email: a.email }, { companyCode: a.companyCode }] }, select: { id: true, status: true, createdAt: true } }),
  ]);
  const rows: [string, string][] = [['კომპანია', a.companyName], ['საიდენტიფიკაციო კოდი', a.companyCode], ['საკონტაქტო პირი', a.contactName], ['ტელეფონი', a.phone], ['ელფოსტა', a.email], ['ენა', a.locale], ['თანხმობა', `${formatDate(a.consentAt)} (ვერსია ${a.consentVersion})`], ['შემოსვლა', formatDate(a.createdAt)]];
  return (
    <>
      <PageHead title={a.companyName} desc={<Badge tone={a.status === 'APPROVED' ? 'ok' : a.status === 'REJECTED' ? 'danger' : 'warn'}>{a.status}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">{rows.map(([k, v]) => <Fragment key={k}><dt className="text-mute">{k}</dt><dd className="font-medium">{v}</dd></Fragment>)}</dl>
          {a.message && <><h3 className="mt-5 text-sm font-semibold">შეტყობინება</h3><p className="mt-1 whitespace-pre-line text-sm text-graphite">{a.message}</p></>}
          {a.reviewNote && <p className="mt-4 text-sm"><strong>შენიშვნა:</strong> {a.reviewNote}</p>}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">განხილვა</h2>
          <div className="mb-4 space-y-2">
            {emailTaken && <Notice tone="warn">ამ ელფოსტით ანგარიში უკვე არსებობს.</Notice>}
            {codeTaken && <Notice tone="warn">ამ კოდით პარტნიორი უკვე არსებობს: <Link className="underline" href={`/admin/partners/${codeTaken.id}`}>{codeTaken.companyName}</Link></Notice>}
            {others.length > 0 && <Notice tone="info">იგივე ელფოსტით/კოდით სხვა განაცხადები: {others.map((o) => <Link key={o.id} className="mr-2 underline" href={`/admin/applications/${o.id}`}>{o.status}</Link>)}</Notice>}
          </div>
          {a.status === 'PENDING' ? (
            <ActionForm action={reviewApplicationAction} className="space-y-4" okText="შენახულია, ელფოსტა გაიგზავნა.">
              <input type="hidden" name="id" value={a.id} />
              <TextArea label="შიდა შენიშვნა (უარყოფისას)" name="note" rows={2} />
              <div className="flex flex-wrap gap-2">
                <ConfirmSubmit label="დამტკიცება" variant="primary" title="განაცხადის დამტკიცება" body={<>შეიქმნება პარტნიორის ანგარიში და <strong>{a.email}</strong>-ზე გაიგზავნება ერთჯერადი ბმული პაროლის შესაქმნელად (72 სთ).</>} name="decision" value="approve" confirmLabel="დამტკიცება" />
                <ConfirmSubmit label="უარყოფა" title="განაცხადის უარყოფა" body="განმცხადებელს გაეგზავნება უარის შეტყობინება." name="decision" value="reject" confirmLabel="უარყოფა" />
              </div>
            </ActionForm>
          ) : a.partner ? (
            <Link className="font-semibold underline" href={`/admin/partners/${a.partner.id}`}>პარტნიორის ანგარიში →</Link>
          ) : (
            <p className="text-sm text-mute">განხილულია {a.reviewedAt && formatDate(a.reviewedAt)}.</p>
          )}
        </Card>
      </div>
    </>
  );
}
