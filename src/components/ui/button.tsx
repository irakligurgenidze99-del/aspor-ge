import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes } from 'react';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'spark';

export const buttonClass = (variant: Variant = 'primary', size: 'sm' | 'md' | 'lg' = 'md') =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-[3px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none',
    size === 'sm' && 'h-9 px-3 text-sm',
    size === 'md' && 'h-11 px-5 text-sm',
    size === 'lg' && 'h-13 px-7 text-base',
    variant === 'primary' && 'bg-ink text-paper hover:bg-graphite',
    variant === 'spark' && 'bg-spark text-ink hover:bg-spark-deep',
    variant === 'secondary' && 'border border-ink text-ink hover:bg-ink hover:text-paper',
    variant === 'ghost' && 'text-ink hover:bg-studio',
    variant === 'danger' && 'bg-danger text-paper hover:opacity-90',
  );

export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return <button {...p} className={cn(buttonClass(variant, size), className)} />;
}
