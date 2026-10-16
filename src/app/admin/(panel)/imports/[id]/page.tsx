import { requireAdmin } from '@/server/auth/guards';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Badge, Card, PageHead, td, th } from '@/components/admin/shell';
import { CommitForm, MappingForm } from '@/components/admin/import-forms';
import { IMPORT_FIELDS, type Mapping } from '@/lib/import/fields';
import { cancelImportAction } from '@/server/actions/admin/imports';
import { Notice } from '@/components/ui/field';
import type { Plan } from '@/lib/import/core';

export default async function ImportJob({ params, searchParams }: PageProps<'/admin/imports/[id]'>) {
  await requireAdmin(); // per-page guard: layouts can be skipped by RSC partial rendering
  const { id } = await params;
  const sp = await searchParams;
  const job = await db.importJob.findUnique({ where: { id } });
  if (!job) notFound();
  const filter = typeof sp.show === 'string' ? sp.show : 'changes';
  const totals = job.totals as Partial<Plan['totals']>;
  const previewed = totals.total !== undefined;
  const rows = previewed
    ? await db.importJobRow.findMany({ where: { jobId: id, ...(filter === 'all' ? {} : filter === 'invalid' ? { action: 'INVALID' } : filter === 'hide' ? { action: 'HIDE' } : { action: { in: ['CREATE', 'UPDATE', 'INVALID'] } }) }, orderBy: { rowNum: 'asc' }, take: 500 })
    : [];
  const mapping = job.mapping as Mapping;
  const raw = job.rawRows as { rows?: Record<string, string>[] };
  const open = job.status === 'PREVIEWED';
  return (
    <>
      <PageHead title={`იმპორტი: ${job.fileName}`} desc={<span className="flex gap-2"><Badge tone={job.mode === 'FULL_CATALOG' ? 'danger' : 'neutral'}>{job.mode === 'FULL_CATALOG' ? 'სრული კატალოგი' : 'ნაწილობრივი'}</Badge><Badge tone={job.status === 'COMMITTED' ? 'ok' : 'warn'}>{job.status}</Badge></span>}
        actions={open ? <form action={cancelImportAction}><input type="hidden" name="jobId" value={job.id} /><button className="text-sm font-semibold underline">გაუქმება</button></form> : undefined} />
      {job.status === 'COMMITTED' && <div className="mb-4"><Notice tone="ok">იმპორტი დასრულდა{job.committedAt ? ` — ${job.committedAt.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}` : ''}.</Notice></div>}
      {job.status === 'CANCELLED' && <div className="mb-4"><Notice tone="info">იმპორტი გაუქმდა — ცვლილებები არ შესრულებულა.</Notice></div>}
      {job.error && <div className="mb-4"><Notice tone="warn"><pre className="whitespace-pre-wrap text-xs">{job.error}</pre></Notice></div>}
      {open && (
        <Card className="mb-6">
          <h2 className="mb-1 font-bold">1. სვეტების მიბმა</h2>
          <p className="mb-4 text-sm text-graphite">ნაპოვნია {job.headers.length} სვეტი, {raw.rows?.length ?? 0} სტრიქონი. ავტომატური შეთავაზება შეგიძლიათ შეცვალოთ.</p>
          {raw.rows?.[0] && <details className="mb-4 text-xs"><summary className="cursor-pointer font-semibold">პირველი სტრიქონის ნიმუში</summary><pre className="mt-2 max-h-64 overflow-auto bg-studio p-3">{JSON.stringify(raw.rows[0], null, 2)}</pre></details>}
          <MappingForm jobId={job.id} headers={job.headers} fields={IMPORT_FIELDS.map((f) => ({ key: f.key, label: f.label, required: f.required }))} mapping={mapping.fields as Record<string, string>} specColumns={mapping.specColumns ?? []} />
        </Card>
      )}
      {previewed && (
        <Card className="mb-6">
          <h2 className="mb-3 font-bold">2. შედეგი (dry run)</h2>
          <dl className="mb-4 grid grid-cols-3 gap-3 text-center sm:grid-cols-6">
            {([['სულ', totals.total], ['ახალი', totals.create], ['შეცვლილი', totals.update], ['უცვლელი', totals.unchanged], ['შეცდომა', totals.invalid], ['დაიმალება', totals.hide]] as const).map(([k, v]) => (
              <div key={k} className={`rounded-[3px] border p-3 ${k === 'შეცდომა' && v ? 'border-danger' : k === 'დაიმალება' && v ? 'border-danger bg-[#fdf0ef]' : 'border-line'}`}><dd className="text-2xl font-extrabold tabular-nums">{v ?? 0}</dd><dt className="text-xs text-mute">{k}</dt></div>
            ))}
          </dl>
          {totals.newCategories && totals.newCategories.length > 0 && <div className="mb-4"><Notice tone="warn">შეიქმნება ახალი კატეგორიები: {totals.newCategories.join(', ')}</Notice></div>}
          <nav className="mb-3 flex gap-2 text-xs font-semibold">{[['changes', 'ცვლილებები'], ['invalid', 'შეცდომები'], ['hide', 'დასამალი'], ['all', 'ყველა']].map(([k, l]) => <a key={k} href={`?show=${k}`} className={`rounded-[3px] px-2 py-1 ${filter === k ? 'bg-ink text-paper' : 'bg-studio'}`}>{l}</a>)}</nav>
          <div className="max-h-[560px] overflow-auto rounded-[3px] border border-line">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-studio"><tr><th className={th}>სტრ.</th><th className={th}>SKU</th><th className={th}>ქმედება</th><th className={th}>დეტალები</th></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>{r.rowNum || '—'}</td>
                    <td className={`${td} font-semibold`}>{r.sku}</td>
                    <td className={td}><Badge tone={r.action === 'CREATE' ? 'ok' : r.action === 'UPDATE' ? 'warn' : r.action === 'INVALID' || r.action === 'HIDE' ? 'danger' : 'neutral'}>{r.action}</Badge></td>
                    <td className={td}>
                      {r.errors.length > 0 && <ul className="text-danger">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                      {r.diff && r.action === 'UPDATE' && (
                        <ul className="space-y-0.5">{Object.entries(r.diff as Record<string, [unknown, unknown]>).map(([f, [o, n]]) => <li key={f}><strong>{f}:</strong> <del className="text-mute">{String(Array.isArray(o) ? o.join(' | ') : o ?? '∅').slice(0, 80)}</del> → <ins className="no-underline">{String(Array.isArray(n) ? n.join(' | ') : n ?? '∅').slice(0, 80)}</ins></li>)}</ul>
                      )}
                      {r.action === 'HIDE' && <span>ფაილში არ არის → დაიმალება</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-mute">ჩანაწერი არ არის.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {previewed && open && (
        <Card>
          <h2 className="mb-3 font-bold">3. დადასტურება</h2>
          {(totals.invalid ?? 0) > 0 ? <Notice tone="error">ფაილში {totals.invalid} არასწორი სტრიქონია. გაასწორეთ და ატვირთეთ ხელახლა — ნაწილობრივი ჩაწერა არ ხდება.</Notice> : <CommitForm jobId={job.id} mode={job.mode} hideCount={job.hideCount} hideSample={job.hideSample} blocked={false} />}
        </Card>
      )}
    </>
  );
}
