'use client';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn('relative px-3 py-2 text-sm font-semibold transition-colors', active ? 'text-ink' : 'text-graphite hover:text-ink')}
    >
      {children}
      {active && <span aria-hidden className="absolute -bottom-[13px] left-3 right-3 h-[3px] -skew-x-[24deg] bg-spark" />}
    </Link>
  );
}
