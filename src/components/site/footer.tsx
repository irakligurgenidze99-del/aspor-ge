import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '../ui/container';
import { Logo } from './logo';
import { listPublicCategories } from '@/server/services/catalog';
import { getSettings } from '@/server/services/content';
import { CookieSettingsButton } from './consent';

export async function Footer() {
  const locale = (await getLocale()) as 'ka' | 'en';
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const [cats, s] = await Promise.all([listPublicCategories(locale), getSettings(['contact.email', 'contact.phone', 'contact.address', 'social.facebook', 'social.instagram'], locale)]);
  return (
    <footer className="mt-24 bg-ink text-paper">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Logo inverse className="h-10 w-auto" />
          <address className="space-y-1 text-sm not-italic text-[#bdbcbc]">
            {s['contact.address'] && <p>{s['contact.address']}</p>}
            {s['contact.phone'] && <p><a className="hover:text-paper" href={`tel:${s['contact.phone'].replace(/\s/g, '')}`}>{s['contact.phone']}</a></p>}
            {s['contact.email'] && <p><a className="hover:text-paper" href={`mailto:${s['contact.email']}`}>{s['contact.email']}</a></p>}
          </address>
        </div>
        <FooterCol title={t('catalog')}>
          {cats.map((c) => (
            <li key={c.id}><Link href={`/categories/${c.slug}`} className="hover:text-paper">{c.name}</Link></li>
          ))}
        </FooterCol>
        <FooterCol title={t('company')}>
          <li><Link href="/about" className="hover:text-paper">{nav('about')}</Link></li>
          <li><Link href="/where-to-buy" className="hover:text-paper">{nav('whereToBuy')}</Link></li>
          <li><Link href="/partners/apply" className="hover:text-paper">{nav('becomePartner')}</Link></li>
          <li><Link href="/contact" className="hover:text-paper">{nav('contact')}</Link></li>
          <li><Link href="/account/login" className="hover:text-paper">{nav('partnerLogin')}</Link></li>
        </FooterCol>
        <FooterCol title={t('legal')}>
          <li><Link href="/terms" className="hover:text-paper">{t('terms')}</Link></li>
          <li><Link href="/privacy" className="hover:text-paper">{t('privacy')}</Link></li>
          <li><Link href="/cookies" className="hover:text-paper">{t('cookies')}</Link></li>
          <li><CookieSettingsButton label={t('cookieSettings')} /></li>
          {s['social.facebook'] && <li><a href={s['social.facebook']} rel="noopener noreferrer" target="_blank" className="hover:text-paper">Facebook</a></li>}
          {s['social.instagram'] && <li><a href={s['social.instagram']} rel="noopener noreferrer" target="_blank" className="hover:text-paper">Instagram</a></li>}
        </FooterCol>
      </Container>
      <Container className="flex flex-col gap-2 border-t border-[#2a2a2a] py-6 text-xs text-[#9a9999] sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} ASPOR. {t('rights')}</p>
        <p>{t('tagline')}</p>
      </Container>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-bold text-paper">{title}</h2>
      <ul className="space-y-2.5 text-sm text-[#bdbcbc]">{children}</ul>
    </div>
  );
}
