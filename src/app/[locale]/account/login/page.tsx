import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { LoginForm } from '@/components/forms/auth-forms';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/login'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('loginTitle'), robots: { index: false } };
}

export default async function Login({ params, searchParams }: PageProps<'/[locale]/account/login'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const nav = await getTranslations('nav');
  const sp = await searchParams;
  return (
    <Container className="max-w-md py-16">
      <span className="blade" aria-hidden />
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{t('loginTitle')}</h1>
      <p className="mb-8 mt-2 text-graphite">{t('loginIntro')}</p>
      <LoginForm next={typeof sp.next === 'string' ? sp.next : undefined} />
      <p className="mt-8 border-t border-line pt-6 text-sm text-graphite">
        {t('noAccount')} <Link href="/partners/apply" className="font-semibold text-ink underline underline-offset-4">{nav('becomePartner')}</Link>
      </p>
    </Container>
  );
}
