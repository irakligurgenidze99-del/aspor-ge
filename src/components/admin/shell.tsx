import Link from 'next/link';
import { Logo } from '../site/logo';
import { adminLogoutAction } from '@/server/actions/admin/auth';
import { AdminNav } from './nav';

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="border-b border-line bg-paper lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin" aria-label="Dashboard"><Logo className="h-6 w-auto" /></Link>
          <span className="rounded-[2px] bg-ink px-1.5 py-0.5 text-[10px] font-bold text-spark">CMS</span>
        </div>
        <AdminNav />
        <div className="border-t border-line px-5 py-4 text-xs text-mute">
          <p className="truncate" title={email}>{email}</p>
          <form action={adminLogoutAction} className="mt-2">
            <button className="font-semibold text-ink underline underline-offset-2">გასვლა</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}

export function PageHead({ title, desc, actions }: { title: string; desc?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 max-w-[80ch] text-sm text-graphite">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[4px] border border-line bg-paper p-5 ${className}`}>{children}</section>;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'dark'; children: React.ReactNode }) {
  const cls = {
    neutral: 'bg-studio text-graphite',
    ok: 'bg-[#e6f4ec] text-ok',
    warn: 'bg-[#fff4c2] text-ink',
    danger: 'bg-[#fde8e6] text-danger',
    dark: 'bg-ink text-paper',
  }[tone];
  return <span className={`inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

export const th = 'px-3 py-2 text-left text-xs font-semibold text-mute';
export const td = 'px-3 py-2.5 align-top';
