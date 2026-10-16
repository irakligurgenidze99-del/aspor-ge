/* eslint-disable @next/next/no-html-link-for-pages -- file downloads served by route handlers, not pages */
import { requireAdmin } from '@/server/auth/guards';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Badge, Card, PageHead, td, th } from '@/components/admin/shell';
import { UploadImportForm } from '@/components/admin/import-forms';
import { buttonClass } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'იმპორტი' };

export default async function Imports() {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const jobs = await db.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, fileName: true, mode: true, status: true, totals: true, createdAt: true, hideCount: true } });
  return (
    <>
      <PageHead title="იმპორტი / ექსპორტი" desc="SKU — უნიკალური გასაღები. ჯერ dry run (ბაზა არ იცვლება), შემდეგ ცვლილებების ნახვა და დადასტურება. პროდუქტები არასოდეს იშლება." actions={<><a href="/admin/api/template?format=xlsx" className={buttonClass('secondary', 'sm')}>შაბლონი .xlsx</a><a href="/admin/api/template?format=csv" className={buttonClass('secondary', 'sm')}>შაბლონი .csv</a><a href="/admin/api/export?format=xlsx" className={buttonClass('secondary', 'sm')}>ექსპორტი .xlsx</a><a href="/admin/api/export?format=csv" className={buttonClass('secondary', 'sm')}>ექსპორტი .csv</a></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card><UploadImportForm /></Card>
        <Card>
          <h2 className="mb-3 font-bold">ისტორია</h2>
          <table className="w-full text-sm">
            <thead><tr><th className={th}>დრო</th><th className={th}>ფაილი</th><th className={th}>ტიპი</th><th className={th}>სტატუსი</th></tr></thead>
            <tbody className="divide-y divide-line">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className={td}>{formatDate(j.createdAt)}</td>
                  <td className={td}><Link className="underline" href={`/admin/imports/${j.id}`}>{j.fileName}</Link></td>
                  <td className={td}><Badge tone={j.mode === 'FULL_CATALOG' ? 'danger' : 'neutral'}>{j.mode === 'FULL_CATALOG' ? 'სრული' : 'ნაწილობრივი'}</Badge></td>
                  <td className={td}><Badge tone={j.status === 'COMMITTED' ? 'ok' : j.status === 'PREVIEWED' ? 'warn' : 'neutral'}>{j.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
