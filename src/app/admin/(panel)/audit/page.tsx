import { requireAdmin } from '@/server/auth/guards';
import { db } from '@/lib/db';
import { PageHead, td, th } from '@/components/admin/shell';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'აუდიტი' };

export default async function Audit({ searchParams }: PageProps<'/admin/audit'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const sp = await searchParams;
  const entity = typeof sp.entity === 'string' ? sp.entity : undefined;
  const logs = await db.auditLog.findMany({ where: entity ? { entityId: entity } : {}, orderBy: { createdAt: 'desc' }, take: 300, include: { actor: { select: { email: true } } } });
  return (
    <>
      <PageHead title="აუდიტის ჟურნალი" desc="მაღალი რისკის ქმედებები: შესვლები, MFA, დამტკიცებები, შეჩერებები, ფასები, იმპორტი, გამოქვეყნება, თარგმანები." />
      <div className="overflow-x-auto rounded-[4px] border border-line bg-paper">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-line bg-studio"><tr><th className={th}>დრო</th><th className={th}>მომხმარებელი</th><th className={th}>ქმედება</th><th className={th}>ობიექტი</th><th className={th}>დეტალები</th></tr></thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className={`${td} whitespace-nowrap`}>{formatDate(l.createdAt)}</td>
                <td className={td}>{l.actor?.email ?? '—'}</td>
                <td className={`${td} font-mono text-xs`}>{l.action}</td>
                <td className={`${td} text-xs`}>{l.entityType} {l.entityId?.slice(0, 10)}</td>
                <td className={`${td} max-w-80 truncate font-mono text-xs text-mute`}>{l.meta ? JSON.stringify(l.meta) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
