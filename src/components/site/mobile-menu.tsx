'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

export function MobileMenu({ label, closeLabel, children }: { label: string; closeLabel: string; children: ReactNode }) {
  const pathname = usePathname();
  // Menu is "open for a pathname" — navigating elsewhere closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenAt((typeof v === 'function' ? v(open) : v) ? pathname : null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenAt(null);
        btn.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-[3px] hover:bg-studio"
      >
        <span className="sr-only">{open ? closeLabel : label}</span>
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
          {open ? <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="2" /> : <path d="M3 6h16M3 11h16M3 16h10" stroke="currentColor" strokeWidth="2" />}
        </svg>
      </button>
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-paper px-4 pb-10 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
