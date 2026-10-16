'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const sp = useSearchParams();
  const t = useTranslations('nav');
  const query = Object.fromEntries(sp.entries());
  return (
    <nav aria-label={t('language')} className={cn('flex items-center text-sm font-semibold', className)}>
      {(['ka', 'en'] as const).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="mx-1.5 text-line">/</span>}
          <Link
            href={{ pathname, query }}
            locale={l}
            hrefLang={l}
            lang={l}
            aria-current={l === locale ? 'true' : undefined}
            className={cn('px-1 py-1', l === locale ? 'text-ink' : 'text-mute hover:text-ink')}
          >
            {l === 'ka' ? 'ქარ' : 'ENG'}
          </Link>
        </span>
      ))}
    </nav>
  );
}
