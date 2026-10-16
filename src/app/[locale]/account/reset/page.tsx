import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { SetPasswordForm } from '@/components/forms/auth-forms';
import { Notice } from '@/components/ui/field';
import { peekToken } from '@/server/services/tokens';

export default async function Page({ params, searchParams }: PageProps<'/[locale]/account/reset'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  const valid = await peekToken(token, 'PASSWORD_RESET');
  return (
    <Container className="max-w-md py-16">
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight">{t('resetTitle')}</h1>
      {valid ? <SetPasswordForm token={token} purpose="reset" /> : <Notice tone="error">{t('tokenInvalid')}</Notice>}
    </Container>
  );
}
