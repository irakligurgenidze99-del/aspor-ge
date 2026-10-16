import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { Container } from '../ui/container';
import { Logo } from './logo';
import { LanguageSwitcher } from './language-switcher';
import { MobileMenu } from './mobile-menu';
import { getPartnerAccount } from '@/server/auth/guards';
import { NavLink } from './nav-link';

export async function Header() {
  const t = await getTranslations('nav');
  const account = await getPartnerAccount();
  const links = [
    { href: '/products', label: t('products') },
    { href: '/about', label: t('about') },
    { href: '/where-to-buy', label: t('whereToBuy') },
    { href: '/partners/apply', label: t('becomePartner') },
    { href: '/contact', label: t('contact') },
  ] as const;
  const accountLink = account ? { href: '/account', label: t('account') } : { href: '/account/login', label: t('partnerLogin') };
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label={`ASPOR — ${t('home')}`}>
          <Logo className="h-8 w-auto" priority />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <Suspense><LanguageSwitcher /></Suspense>
          <Link href={accountLink.href} className="inline-flex h-10 items-center rounded-[3px] bg-ink px-4 text-sm font-semibold text-paper hover:bg-graphite">
            {accountLink.label}
          </Link>
        </div>
        <MobileMenu label={t('menu')} closeLabel={t('close')}>
          <nav aria-label="Mobile" className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="border-b border-line py-4 text-lg font-semibold">{l.label}</Link>
            ))}
            <Link href={accountLink.href} className="mt-6 inline-flex h-12 items-center justify-center rounded-[3px] bg-ink px-4 font-semibold text-paper">{accountLink.label}</Link>
            <Suspense><LanguageSwitcher className="mt-6" /></Suspense>
          </nav>
        </MobileMenu>
      </Container>
    </header>
  );
}
