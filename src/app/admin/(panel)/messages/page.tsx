import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, PageHead, td, th } from '@/components/admin/shell';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'შეტყობინებები' };

export default async function Messages({ searchParams }: PageProps<'/admin/messages'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const sp = await searchParams;
  const status = sp.status === 'ARCHIVED' ? 'ARCHIVED' : undefined;
  const msgs = await db.contactMessage.findMany({ where: status ? { status } : { status: { not: 'ARCHIVED' } }, orderBy: { createdAt: 'desc' }, take: 200 });
  return (
    <>
      <PageHead title="საკონტაქტო შეტყობინებები" actions={<Link className="text-sm font-semibold underline" href={status ? '?' : '?status=ARCHIVED'}>{status ? 'აქტიური' : 'არქივი'}</Link>} />
      <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-line bg-studio"><tr><th className={th}>თარიღი</th><th className={th}>გამგზავნი</th><th className={th}>თემა</th><th className={th}>სტატუსი</th></tr></thead>
          <tbody className="divide-y divide-line">
            {msgs.map((m) => (
              <tr key={m.id} className={m.status === 'NEW' ? 'font-semibold' : ''}>
                <td className={td}>{formatDate(m.createdAt)}</td>
                <td className={td}><Link className="underline" href={`/admin/messages/${m.id}`}>{m.name}</Link><br /><span className="font-normal text-mute">{m.email}</span></td>
                <td className={td}>{m.subject || m.message.slice(0, 60)}</td>
                <td className={td}><Badge tone={m.status === 'NEW' ? 'warn' : 'neutral'}>{m.status}</Badge></td>
              </tr>
            ))}
            {msgs.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-mute">შეტყობინებები არ არის.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
