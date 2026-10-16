'use client';
import { useState, useTransition } from 'react';
import { SECTION_FIELDS, type FieldDef, type SectionType } from '@/lib/page-builder/registry';
import { saveSectionAction } from '@/server/actions/admin/content';
import { Notice } from '../ui/field';
import { Button } from '../ui/button';
import { inputClass } from '../ui/field';

type Media = { id: string; url: string; name: string };
type Obj = Record<string, unknown>;

/** Schema-driven editor for one section. Georgian & English side-by-side; server re-validates. */
export function SectionEditor({ id, type, initial, media }: { id: string; type: SectionType; initial: Obj; media: Media[] }) {
  const [data, setData] = useState<Obj>(initial);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const def = SECTION_FIELDS[type];
  const save = () =>
    start(async () => {
      setMsg(await saveSectionAction(id, JSON.stringify(data)));
    });
  return (
    <div className="space-y-4">
      {def.fields.map((f) => (
        <Field key={f.name} f={f} value={data[f.name]} onChange={(v) => setData((d) => ({ ...d, [f.name]: v }))} media={media} idPrefix={id} />
      ))}
      {msg?.error && <Notice tone="error">{msg.error}</Notice>}
      {msg?.ok && <Notice tone="ok">შენახულია (დრაფტი). ცვლილება საჯაროდ გამოჩნდება გამოქვეყნების შემდეგ.</Notice>}
      <Button type="button" size="sm" onClick={save} disabled={pending}>{pending ? '…' : 'სექციის შენახვა'}</Button>
    </div>
  );
}

function Field({ f, value, onChange, media, idPrefix }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; media: Media[]; idPrefix: string }) {
  const fid = `${idPrefix}-${f.name}`;
  if (f.kind === 'ltext' || f.kind === 'ltextarea' || f.kind === 'lrich') {
    const v = (value ?? { ka: '', en: '' }) as { ka: string; en: string };
    const El = f.kind === 'ltext' ? 'input' : 'textarea';
    const rows = f.kind === 'lrich' ? 10 : 3;
    return (
      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold">{f.label}</legend>
        {f.help && <p className="text-xs text-mute">{f.help}</p>}
        <div className="grid gap-2 md:grid-cols-2">
          {(['ka', 'en'] as const).map((l) => (
            <label key={l} className="block text-xs text-mute">
              {l === 'ka' ? 'ქართული' : 'English (საჭიროებს დამტკიცებას)'}
              <El id={`${fid}-${l}`} value={v[l] ?? ''} rows={rows} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...v, [l]: e.target.value })} className={`${inputClass} mt-1 text-sm ${f.kind === 'lrich' ? 'font-mono' : ''}`} />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (f.kind === 'text' || f.kind === 'href') {
    return (
      <label className="block text-sm font-semibold">
        {f.label}
        <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={f.kind === 'href' ? '/products ან https://…' : ''} className={`${inputClass} mt-1 text-sm`} />
      </label>
    );
  }
  if (f.kind === 'number') {
    return (
      <label className="block text-sm font-semibold">
        {f.label}
        <input type="number" value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={`${inputClass} mt-1 w-32 text-sm`} />
      </label>
    );
  }
  if (f.kind === 'select') {
    return (
      <label className="block text-sm font-semibold">
        {f.label}
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1 w-40 text-sm`}>
          {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  if (f.kind === 'media') {
    const cur = media.find((m) => m.id === value);
    return (
      <div className="text-sm">
        <label className="font-semibold" htmlFor={fid}>{f.label}</label>
        <div className="mt-1 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cur && <img src={cur.url} alt="" className="size-14 border border-line object-contain" />}
          <select id={fid} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${inputClass} text-sm`}>
            <option value="">— სურათის გარეშე —</option>
            {media.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
    );
  }
  if (f.kind === 'list') {
    const items = (Array.isArray(value) ? value : []) as Obj[];
    const blank = () => Object.fromEntries((f.item ?? []).map((i) => [i.name, i.kind.startsWith('l') ? { ka: '', en: '' } : '']));
    return (
      <fieldset className="space-y-2 rounded-[3px] border border-line p-3">
        <legend className="px-1 text-sm font-semibold">{f.label}</legend>
        {items.map((it, idx) => (
          <div key={idx} className="space-y-2 border-b border-line pb-3">
            {(f.item ?? []).map((sub) => (
              <Field key={sub.name} f={sub} value={it[sub.name]} media={media} idPrefix={`${fid}-${idx}`} onChange={(v) => onChange(items.map((x, j) => (j === idx ? { ...x, [sub.name]: v } : x)))} />
            ))}
            <div className="flex gap-3 text-xs font-semibold">
              <button type="button" disabled={idx === 0} className="underline disabled:opacity-30" onClick={() => { const c = [...items]; [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; onChange(c); }}>↑</button>
              <button type="button" disabled={idx === items.length - 1} className="underline disabled:opacity-30" onClick={() => { const c = [...items]; [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; onChange(c); }}>↓</button>
              <button type="button" className="text-danger underline" onClick={() => onChange(items.filter((_, j) => j !== idx))}>წაშლა</button>
            </div>
          </div>
        ))}
        {items.length < (f.max ?? 20) && <button type="button" className="text-sm font-semibold underline" onClick={() => onChange([...items, blank()])}>+ დამატება</button>}
      </fieldset>
    );
  }
  return null;
}
