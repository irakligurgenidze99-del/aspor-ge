import { requireAdmin } from '@/server/auth/guards';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, PageHead } from '@/components/admin/shell';
import { messageStatusAction } from '@/server/actions/admin/b2b';
import { formatDate } from '@/lib/format';
import { buttonClass } from '@/components/ui/button';

export default async function MessageDetail({ params }: PageProps<'/admin/messages/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const m = await db.contactMessage.findUnique({ where: { id } });
  if (!m) notFound();
  if (m.status === 'NEW') await db.contactMessage.update({ where: { id }, data: { status: 'READ' } });
  return (
    <>
      <PageHead title={m.subject || 'შეტყობინება'} desc={formatDate(m.createdAt)} />
      <Card className="max-w-3xl">
        <p className="text-sm"><strong>{m.name}</strong> · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · <a className="underline" href={`tel:${m.phone}`}>{m.phone}</a></>} · {m.locale}</p>
        {/* Rendered as text (React escapes) — never as HTML. */}
        <p className="mt-4 whitespace-pre-line">{m.message}</p>
        <div className="mt-6 flex gap-2">
          <a className={buttonClass('primary', 'sm')} href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'ASPOR'))}`}>პასუხი ელფოსტით</a>
          <form action={messageStatusAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value={m.status === 'ARCHIVED' ? 'READ' : 'ARCHIVED'} /><button className={buttonClass('secondary', 'sm')}>{m.status === 'ARCHIVED' ? 'არქივიდან ამოღება' : 'არქივში'}</button></form>
        </div>
      </Card>
    </>
  );
}
