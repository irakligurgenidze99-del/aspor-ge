import { cn } from '@/lib/cn';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

export const inputClass =
  'block w-full rounded-[3px] border border-line bg-paper px-3 py-2.5 text-base text-ink placeholder:text-mute focus-visible:border-ink aria-[invalid=true]:border-danger';

type Common = { label: ReactNode; name: string; error?: string; hint?: ReactNode; className?: string };

function Wrap({ label, name, error, hint, className, children, required }: Common & { children: ReactNode; required?: boolean }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={name} className="block text-sm font-semibold text-ink">
        {label}
        {required && <span aria-hidden className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${name}-hint`} className="text-xs text-mute">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

const describedBy = (name: string, error?: string, hint?: ReactNode) => (error ? `${name}-error` : hint ? `${name}-hint` : undefined);

export function TextField({ label, name, error, hint, className, ...p }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrap {...{ label, name, error, hint, className }} required={p.required}>
      <input id={name} name={name} aria-invalid={!!error} aria-describedby={describedBy(name, error, hint)} className={inputClass} {...p} />
    </Wrap>
  );
}

export function TextArea({ label, name, error, hint, className, ...p }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrap {...{ label, name, error, hint, className }} required={p.required}>
      <textarea id={name} name={name} aria-invalid={!!error} aria-describedby={describedBy(name, error, hint)} className={cn(inputClass, 'min-h-28')} {...p} />
    </Wrap>
  );
}

export function SelectField({ label, name, error, hint, className, children, ...p }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrap {...{ label, name, error, hint, className }} required={p.required}>
      <select id={name} name={name} aria-invalid={!!error} aria-describedby={describedBy(name, error, hint)} className={inputClass} {...p}>
        {children}
      </select>
    </Wrap>
  );
}

export function Checkbox({ name, label, error, ...p }: { name: string; label: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-graphite">
        <input type="checkbox" id={name} name={name} aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} className="mt-0.5 size-5 shrink-0 accent-ink" {...p} />
        <span>{label}</span>
      </label>
      {error && <p id={`${name}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'error' | 'warn'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[3px] border-l-4 px-4 py-3 text-sm',
        tone === 'info' && 'border-ink bg-studio',
        tone === 'ok' && 'border-ok bg-[#eef7f1] text-ok',
        tone === 'error' && 'border-danger bg-[#fdf0ef] text-danger',
        tone === 'warn' && 'border-spark-deep bg-[#fff8db] text-ink',
      )}
    >
      {children}
    </div>
  );
}
