'use client';
import { useActionState, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { AState } from '@/server/actions/admin/auth';
import { Notice } from '../ui/field';
import { Button, type Variant } from '../ui/button';

/** Form wired to an (AState, FormData) server action, with status notices. */
export function ActionForm({ action, children, className, okText = 'შენახულია.', resetOnOk }: { action: (s: AState, fd: FormData) => Promise<AState>; children: ReactNode; className?: string; okText?: string; resetOnOk?: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, run] = useActionState<AState, FormData>(async (s, fd) => {
    const r = await action(s, fd);
    if (r.ok && resetOnOk) ref.current?.reset();
    return r;
  }, {});
  return (
    <form ref={ref} action={run} className={className}>
      {state.error && <div className="mb-4"><Notice tone="error">{state.error}</Notice></div>}
      {state.ok && <div className="mb-4"><Notice tone="ok">{okText}</Notice></div>}
      {children}
    </form>
  );
}

export function Submit({ children, variant = 'primary', size = 'md', name, value }: { children: ReactNode; variant?: Variant; size?: 'sm' | 'md'; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} size={size} disabled={pending} name={name} value={value}>{pending ? '…' : children}</Button>;
}

/** Destructive/bulk confirmation via native <dialog> (focus-trapped, Esc closes). */
export function ConfirmSubmit({ label, title, body, confirmLabel = 'დადასტურება', variant = 'danger', size = 'sm', name, value, form }: { label: ReactNode; title: string; body: ReactNode; confirmLabel?: string; variant?: Variant; size?: 'sm' | 'md'; name?: string; value?: string; form?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant === 'danger' ? 'secondary' : variant} size={size} onClick={() => { dlg.current?.showModal(); setOpen(true); }}>{label}</Button>
      <dialog ref={dlg} className="m-auto w-[min(92vw,440px)] rounded-[4px] border border-line p-0 backdrop:bg-black/40" onClose={() => setOpen(false)}>
        <div className="p-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="mt-2 text-sm text-graphite">{body}</div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => dlg.current?.close()}>გაუქმება</Button>
            <Button type="submit" variant={variant} size="sm" name={name} value={value} form={form} onClick={() => setTimeout(() => dlg.current?.close(), 0)}>{confirmLabel}</Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
