import { AdminLoginForm } from '@/components/admin/auth-forms';
export const metadata = { title: 'შესვლა' };
export default function Page() {
  return (<><h1 className="mb-6 text-xl font-bold">ადმინისტრატორის შესვლა</h1><AdminLoginForm /></>);
}
