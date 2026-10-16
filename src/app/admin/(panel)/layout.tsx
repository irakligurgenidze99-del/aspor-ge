import { requireAdmin } from '@/server/auth/guards';
import { AdminShell } from '@/components/admin/shell';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
