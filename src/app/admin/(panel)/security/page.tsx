import { requireAdmin } from '@/server/auth/guards';
import { Card, PageHead } from '@/components/admin/shell';
import { RegenerateCodes, ResetMfaForm } from '@/components/admin/auth-forms';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'უსაფრთხოება' };

export default async function Security() {
  const u = await requireAdmin();
  return (
    <>
      <PageHead title="უსაფრთხოება" desc="ადმინისტრატორის ორფაქტორიანი ავთენტიფიკაცია (TOTP, RFC 6238) და აღდგენის კოდები." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">MFA სტატუსი</h2>
          <p className="mt-2 text-sm">{u.totpEnabledAt ? `ჩართულია ${formatDate(u.totpEnabledAt)}` : 'გამორთულია'} · დარჩენილი აღდგენის კოდები: <strong>{u.recoveryCodes.length}</strong></p>
          <div className="mt-5"><RegenerateCodes /></div>
        </Card>
        <Card>
          <h2 className="font-bold">ახალი ტელეფონი / ავთენტიფიკატორი</h2>
          <p className="mb-4 mt-2 text-sm text-graphite">დაადასტურეთ მიმდინარე კოდით — შემდეგ დააკავშირებთ ახალ მოწყობილობას.</p>
          <ResetMfaForm />
        </Card>
      </div>
    </>
  );
}
