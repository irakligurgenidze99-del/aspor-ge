import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { MfaForm } from '@/components/admin/auth-forms';
export const metadata = { title: 'MFA' };
export default async function Page() {
  const s = await getSession('admin');
  if (!s) redirect('/admin/login');
  if (process.env.ADMIN_MFA_REQUIRED === 'false') redirect('/admin');
  if (!s.user.totpEnabledAt) redirect('/admin/mfa/setup');
  if (s.mfaPassed) redirect('/admin');
  return (<><h1 className="mb-2 text-xl font-bold">ორფაქტორიანი შემოწმება</h1><p className="mb-6 text-sm text-graphite">შეიყვანეთ კოდი ავთენტიფიკატორის აპლიკაციიდან.</p><MfaForm /></>);
}
