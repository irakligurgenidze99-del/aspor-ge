import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, PageHead, td, th } from '@/components/admin/shell';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'განაცხადები' };

export default async function Applications({ searchParams }: PageProps<'/admin/applications'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const sp = await searchParams;
  const status = sp.status === 'APPROVED' || sp.status === 'REJECTED' ? sp.status : sp.status === 'ALL' ? undefined : 'PENDING';
  const apps = await db.partnershipApplication.findMany({ where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, take: 200 });
  const tabs = [['PENDING', 'განსახილველი'], ['APPROVED', 'დამტკიცებული'], ['REJECTED', 'უარყოფილი'], ['ALL', 'ყველა']] as const;
  return (
    <>
      <PageHead title="პარტნიორობის განაცხადები" />
      <nav className="mb-4 flex gap-2 text-sm">
        {tabs.map(([k, l]) => <Link key={k} href={`?status=${k}`} className={`rounded-[3px] px-3 py-1.5 font-semibold ${(status ?? 'ALL') === k ? 'bg-ink text-paper' : 'bg-paper'}`}>{l}</Link>)}
      </nav>
      <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-studio"><tr><th className={th}>თარიღი</th><th className={th}>კომპანია</th><th className={th}>ს/კ</th><th className={th}>საკონტაქტო</th><th className={th}>ელფოსტა</th><th className={th}>სტატუსი</th></tr></thead>
          <tbody className="divide-y divide-line">
            {apps.map((a) => (
              <tr key={a.id}>
                <td className={td}>{formatDate(a.createdAt)}</td>
                <td className={`${td} font-semibold`}><Link className="underline" href={`/admin/applications/${a.id}`}>{a.companyName}</Link></td>
                <td className={td}>{a.companyCode}</td>
                <td className={td}>{a.contactName}<br /><span className="text-mute">{a.phone}</span></td>
                <td className={td}>{a.email}</td>
                <td className={td}><Badge tone={a.status === 'APPROVED' ? 'ok' : a.status === 'REJECTED' ? 'danger' : 'warn'}>{a.status}</Badge></td>
              </tr>
            ))}
            {apps.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-mute">განაცხადები არ არის.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
