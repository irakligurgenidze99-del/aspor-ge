'use client';
import { useActionState, useState } from 'react';
import { uploadImportAction, previewImportAction, commitImportAction } from '@/server/actions/admin/imports';
import type { AState } from '@/server/actions/admin/auth';
import { Notice } from '../ui/field';
import { Submit } from './forms';

export function UploadImportForm() {
  const [s, a] = useActionState<AState, FormData>(uploadImportAction, {});
  const [mode, setMode] = useState('PARTIAL');
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <div>
        <label htmlFor="file" className="block text-sm font-semibold">ფაილი (.xlsx ან .csv, ≤4MB, ≤5000 სტრიქონი)</label>
        <input id="file" name="file" type="file" accept=".xlsx,.csv" required className="mt-1 text-sm" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">იმპორტის ტიპი</legend>
        <label className="flex gap-3 rounded-[3px] border border-line p-3 text-sm has-[:checked]:border-ink">
          <input type="radio" name="mode" value="PARTIAL" checked={mode === 'PARTIAL'} onChange={() => setMode('PARTIAL')} className="mt-1 accent-ink" />
          <span><strong>ნაწილობრივი (partial)</strong> — ქმნის/ანახლებს მხოლოდ ფაილში არსებულ SKU-ებს. დანარჩენი პროდუქტები <u>არ იცვლება</u>.</span>
        </label>
        <label className="flex gap-3 rounded-[3px] border border-line p-3 text-sm has-[:checked]:border-danger">
          <input type="radio" name="mode" value="FULL_CATALOG" checked={mode === 'FULL_CATALOG'} onChange={() => setMode('FULL_CATALOG')} className="mt-1 accent-ink" />
          <span><strong>სრული კატალოგი (authoritative)</strong> — ფაილი = მთელი კატალოგი. ბაზაში არსებული SKU-ები, რომლებიც ფაილში <u>არ არის, დაიმალება</u> (არ წაიშლება). დადასტურებამდე ნახავთ რაოდენობას და მაგალითებს.</span>
        </label>
      </fieldset>
      <Submit>ატვირთვა და სვეტების მიბმა</Submit>
    </form>
  );
}

export function MappingForm({ jobId, headers, fields, mapping, specColumns }: { jobId: string; headers: string[]; fields: { key: string; label: string; required: boolean }[]; mapping: Record<string, string>; specColumns: string[] }) {
  const [s, a] = useActionState<AState, FormData>(previewImportAction, {});
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <input type="hidden" name="jobId" value={jobId} />
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="font-semibold">{f.label}{f.required && <span className="text-danger"> *</span>}</span>
            <select name={`map:${f.key}`} defaultValue={mapping[f.key] ?? ''} className="mt-1 h-10 w-full rounded-[3px] border border-line px-2">
              <option value="">— არ არის —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
        ))}
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">დამატებითი სვეტები → მახასიათებლები (სვეტის სახელი = მახასიათებლის სახელი)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {headers.map((h) => (
            <label key={h} className="flex items-center gap-1.5 rounded-[3px] border border-line px-2 py-1 text-xs has-[:checked]:border-ink has-[:checked]:bg-studio">
              <input type="checkbox" name="spec" value={h} defaultChecked={specColumns.includes(h)} className="accent-ink" />{h}
            </label>
          ))}
        </div>
      </fieldset>
      <Submit>შემოწმება (dry run) — ბაზა არ იცვლება</Submit>
    </form>
  );
}

export function CommitForm({ jobId, mode, hideCount, hideSample, blocked }: { jobId: string; mode: string; hideCount: number; hideSample: string[]; blocked: boolean }) {
  const [s, a] = useActionState<AState, FormData>(commitImportAction, {});
  if (s.ok) return <Notice tone="ok">იმპორტი დასრულდა.{Number(s.data?.imageErrors) > 0 && ` სურათების შეცდომები: ${s.data?.imageErrors} (იხ. ქვემოთ).`} განაახლეთ გვერდი შედეგის სანახავად.</Notice>;
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <input type="hidden" name="jobId" value={jobId} />
      {mode === 'FULL_CATALOG' && (
        <div className="rounded-[3px] border-2 border-danger p-4 text-sm">
          <p className="font-bold text-danger">სრული კატალოგის იმპორტი: {hideCount} SKU დაიმალება (არ წაიშლება).</p>
          {hideSample.length > 0 && <p className="mt-1">მაგალითები: <code>{hideSample.join(', ')}</code>{hideCount > hideSample.length && ' …'}</p>}
          <label className="mt-3 block font-semibold">დასადასტურებლად ჩაწერეთ რიცხვი {hideCount}
            <input name="confirmHideCount" inputMode="numeric" required className="mt-1 block h-10 w-32 rounded-[3px] border border-line px-2" />
          </label>
        </div>
      )}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-ink" />ვნახე ცვლილებები და ვადასტურებ იმპორტს.</label>
      <Submit variant={mode === 'FULL_CATALOG' ? 'danger' : 'primary'}>{blocked ? 'ჯერ გაასწორეთ შეცდომები' : 'იმპორტის დადასტურება'}</Submit>
    </form>
  );
}
