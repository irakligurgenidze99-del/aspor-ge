import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { ForgotForm } from '@/components/forms/auth-forms';

export default async function Forgot({ params }: PageProps<'/[locale]/account/forgot'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('forgotTitle')}</h1>
      <p className="mb-8 mt-2 text-graphite">{t('forgotIntro')}</p>
      <ForgotForm />
    </Container>
  );
}
