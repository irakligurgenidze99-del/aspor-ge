import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/components/ui/container';
import { buttonClass } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <Container className="py-28">
      <span className="blade" aria-hidden />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">{t('notFoundTitle')}</h1>
      <p className="mt-3 text-graphite">{t('notFoundBody')}</p>
      <Link href="/" className={buttonClass('primary') + ' mt-8'}>{t('backHome')}</Link>
    </Container>
  );
}
