/* eslint-disable @next/next/no-img-element */
import { startMfaEnrollment } from '@/server/actions/admin/auth';
import { MfaConfirmForm } from '@/components/admin/auth-forms';
export const metadata = { title: 'MFA-ს ჩართვა' };
export default async function Page() {
  const { secret, qr } = await startMfaEnrollment();
  return (
    <>
      <h1 className="mb-2 text-xl font-bold">MFA-ს ჩართვა (სავალდებულო)</h1>
      <ol className="mb-6 list-decimal space-y-1 pl-5 text-sm text-graphite">
        <li>გახსენით ავთენტიფიკატორი (Google Authenticator, Microsoft Authenticator, 1Password, Authy…).</li>
        <li>დაასკანერეთ QR კოდი ან ხელით შეიყვანეთ გასაღები.</li>
        <li>შეიყვანეთ აპლიკაციაში ნაჩვენები 6-ნიშნა კოდი.</li>
      </ol>
      <img src={qr} alt="TOTP QR კოდი" width={220} height={220} className="mx-auto mb-4 border border-line" />
      <p className="mb-6 break-all rounded-[3px] bg-studio p-3 text-center font-mono text-sm" data-testid="totp-secret">{secret}</p>
      <MfaConfirmForm />
    </>
  );
}
