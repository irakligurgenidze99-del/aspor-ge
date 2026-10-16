import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { ChangePasswordForm, ProfileForm } from '@/components/forms/auth-forms';
import { Notice } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { getSession } from '@/server/auth/session';
import { partnerLogoutAction } from '@/server/actions/public';
import { buttonClass } from '@/components/ui/button';

export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const s = await getSession('partner');
  if (!s || !s.user.partner) redirect(`/${locale}/account/login`);
  const p = s.user.partner;
  const t = await getTranslations('account');
  const a = await getTranslations('auth');
  const nav = await getTranslations('nav');
  const suspended = p.status !== 'ACTIVE' || s.user.status !== 'ACTIVE';
  return (
    <Container className="py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-graphite">{p.companyName}</p>
        </div>
        <form action={partnerLogoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button className={buttonClass('secondary', 'sm')}>{nav('logout')}</button>
        </form>
      </div>
      {suspended && <div className="mt-6"><Notice tone="warn">{a('suspended')}</Notice></div>}
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_1fr]">
        <section>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-y border-line py-5 text-sm">
            <dt className="text-mute">{t('company')}</dt><dd className="font-semibold">{p.companyName}</dd>
            <dt className="text-mute">{t('companyCode')}</dt><dd className="font-semibold">{p.companyCode}</dd>
            <dt className="text-mute">{t('email')}</dt><dd className="font-semibold">{s.user.email}</dd>
            <dt className="text-mute">{t('status')}</dt><dd className="font-semibold">{suspended ? t('suspended') : t('active')}</dd>
          </dl>
          <p className="mt-3 text-xs text-mute">{t('readonlyNote')}</p>
          {!suspended && <Link href="/products" className={buttonClass('primary') + ' mt-6'}>{t('browse')}</Link>}
          <h2 className="mb-4 mt-12 text-lg font-bold">{t('changePassword')}</h2>
          <ChangePasswordForm />
        </section>
        <section>
          <ProfileForm initial={{ contactName: p.contactName, phone: p.phone, address: p.address ?? '' }} />
        </section>
      </div>
    </Container>
  );
}
