'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { adminLoginAction, adminMfaAction, confirmMfaEnrollment, adminForgotAction, adminResetAction, resetMfaAction, regenerateRecoveryCodes, type AState } from '@/server/actions/admin/auth';
import { Notice, TextField } from '../ui/field';
import { Button } from '../ui/button';

export function AdminLoginForm() {
  const [s, a, p] = useActionState<AState, FormData>(adminLoginAction, {});
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <TextField label="ელფოსტა" name="email" type="email" required autoComplete="username" />
      <TextField label="პაროლი" name="password" type="password" required autoComplete="current-password" />
      <Button className="w-full" disabled={p}>შესვლა</Button>
      <p className="text-sm"><Link href="/admin/forgot" className="underline">პაროლის აღდგენა</Link></p>
    </form>
  );
}

export function MfaForm() {
  const [s, a, p] = useActionState<AState, FormData>(adminMfaAction, {});
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <TextField label="ავთენტიფიკატორის 6-ნიშნა კოდი ან აღდგენის კოდი" name="code" required autoComplete="one-time-code" inputMode="text" autoFocus />
      <Button className="w-full" disabled={p}>დადასტურება</Button>
    </form>
  );
}

function Codes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-3">
      <Notice tone="warn">შეინახეთ აღდგენის კოდები უსაფრთხო ადგილას (მაგ. პაროლების მენეჯერში). თითოეული ერთჯერადია. ეს სია აღარ გამოჩნდება.</Notice>
      <ul className="grid grid-cols-2 gap-2 rounded-[3px] bg-studio p-4 font-mono text-sm" data-testid="recovery-codes">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}

export function MfaConfirmForm() {
  const [s, a, p] = useActionState<AState, FormData>(confirmMfaEnrollment, {});
  if (s.ok) {
    return (
      <div className="space-y-4">
        <Notice tone="ok">MFA ჩართულია.</Notice>
        <Codes codes={(s.data?.codes as string[]) ?? []} />
        <Link href="/admin" className="inline-flex h-11 items-center rounded-[3px] bg-ink px-5 text-sm font-semibold text-paper">ადმინ პანელში გადასვლა</Link>
      </div>
    );
  }
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <TextField label="აპლიკაციაში ნაჩვენები კოდი" name="code" required inputMode="numeric" autoComplete="one-time-code" />
      <Button disabled={p}>MFA-ს ჩართვა</Button>
    </form>
  );
}

export function RegenerateCodes() {
  const [s, a, p] = useActionState<AState, FormData>(async () => regenerateRecoveryCodes(), {});
  return (
    <form action={a} className="space-y-4">
      {s.ok && <Codes codes={(s.data?.codes as string[]) ?? []} />}
      <Button variant="secondary" disabled={p}>ახალი აღდგენის კოდების გენერირება</Button>
    </form>
  );
}

export function ResetMfaForm() {
  const [s, a, p] = useActionState<AState, FormData>(resetMfaAction, {});
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <TextField label="მიმდინარე 6-ნიშნა კოდი" name="code" required inputMode="numeric" />
      <Button variant="danger" disabled={p}>ავთენტიფიკატორის ხელახლა დაკავშირება</Button>
    </form>
  );
}

export function AdminForgotForm() {
  const [s, a, p] = useActionState<AState, FormData>(adminForgotAction, {});
  if (s.ok) return <Notice tone="ok">თუ ანგარიში არსებობს, ბმული გაიგზავნა.</Notice>;
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <TextField label="ელფოსტა" name="email" type="email" required />
      <Button disabled={p}>ბმულის გაგზავნა</Button>
    </form>
  );
}

export function AdminResetForm({ token }: { token: string }) {
  const [s, a, p] = useActionState<AState, FormData>(adminResetAction, {});
  if (s.ok) return <Notice tone="ok">პაროლი შეიცვალა. <Link className="underline" href="/admin/login">შესვლა</Link></Notice>;
  return (
    <form action={a} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <TextField label="ახალი პაროლი (მინ. 12)" name="password" type="password" required autoComplete="new-password" />
      <TextField label="გაიმეორეთ" name="confirm" type="password" required autoComplete="new-password" />
      <Button disabled={p}>შენახვა</Button>
    </form>
  );
}
