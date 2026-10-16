import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, PageHead, td, th } from '@/components/admin/shell';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'პარტნიორები' };

export default async function Partners() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const partners = await db.b2BPartner.findMany({ orderBy: { createdAt: 'desc' }, include: { user: true } });
  return (
    <>
      <PageHead title="B2B პარტნიორები" desc="პარტნიორის ანგარიში იქმნება მხოლოდ განაცხადის დამტკიცებით. შეჩერება მოქმედებს მყისიერად — ფასები აღარ ჩანს და სესიები უქმდება." />
      <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-studio"><tr><th className={th}>კომპანია</th><th className={th}>ს/კ</th><th className={th}>ელფოსტა</th><th className={th}>ანგარიში</th><th className={th}>ბოლო შესვლა</th></tr></thead>
          <tbody className="divide-y divide-line">
            {partners.map((p) => (
              <tr key={p.id}>
                <td className={`${td} font-semibold`}><Link className="underline" href={`/admin/partners/${p.id}`}>{p.companyName}</Link></td>
                <td className={td}>{p.companyCode}</td>
                <td className={td}>{p.user.email}</td>
                <td className={td}><div className="flex gap-1">{p.status === 'SUSPENDED' ? <Badge tone="danger">შეჩერებული</Badge> : p.user.status === 'PENDING_SETUP' ? <Badge tone="warn">ელოდება პაროლს</Badge> : <Badge tone="ok">აქტიური</Badge>}</div></td>
                <td className={td}>{p.user.lastLoginAt ? formatDate(p.user.lastLoginAt) : '—'}</td>
              </tr>
            ))}
            {partners.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-mute">პარტნიორები ჯერ არ არის.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
