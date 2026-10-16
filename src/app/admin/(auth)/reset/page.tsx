import { AdminResetForm } from '@/components/admin/auth-forms';
import { peekToken } from '@/server/services/tokens';
import { Notice } from '@/components/ui/field';
export default async function Page({ searchParams }: PageProps<'/admin/reset'>) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : '';
  const ok = await peekToken(token, 'PASSWORD_RESET');
  return (<><h1 className="mb-6 text-xl font-bold">ახალი პაროლი</h1>{ok ? <AdminResetForm token={token} /> : <Notice tone="error">ბმული არასწორია ან ვადაგასულია.</Notice>}</>);
}
