'use client';
import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { changePasswordAction, forgotPasswordAction, partnerLoginAction, setPasswordAction, updateProfileAction, type FormState } from '@/server/actions/public';
import { Notice, TextField } from '../ui/field';
import { Button } from '../ui/button';
import { Link } from '@/i18n/navigation';
import { useMsg } from './use-msg';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(partnerLoginAction, {});
  return (
    <form action={action} className="space-y-5">
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <TextField label={t('email')} name="email" type="email" required autoComplete="username" defaultValue={state.values?.email} />
      <TextField label={t('password')} name="password" type="password" required autoComplete="current-password" />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{t('login')}</Button>
      <p className="text-sm"><Link href="/account/forgot" className="underline underline-offset-4">{t('forgot')}</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  if (state.ok) return <Notice tone="ok">{t('forgotSent')}</Notice>;
  return (
    <form action={action} className="space-y-5">
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <input type="hidden" name="locale" value={locale} />
      <TextField label={t('email')} name="email" type="email" required autoComplete="email" />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{t('send')}</Button>
    </form>
  );
}

export function SetPasswordForm({ token, purpose }: { token: string; purpose: 'setup' | 'reset' }) {
  const t = useTranslations('auth');
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(setPasswordAction, {});
  if (state.ok)
    return (
      <div className="space-y-4">
        <Notice tone="ok">{t('passwordSet')}</Notice>
        <Link href="/account/login" className="inline-flex h-11 items-center rounded-[3px] bg-ink px-5 text-sm font-semibold text-paper">{t('login')}</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-5">
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="purpose" value={purpose} />
      <TextField label={t('newPassword')} name="password" type="password" required autoComplete="new-password" minLength={10} hint={t('passwordHint')} error={m(state.fields?.password)} />
      <TextField label={t('confirmPassword')} name="confirm" type="password" required autoComplete="new-password" error={m(state.fields?.confirm)} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{t('save')}</Button>
    </form>
  );
}

export function ProfileForm({ initial }: { initial: { contactName: string; phone: string; address: string } }) {
  const t = useTranslations('account');
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-5">
      {state.ok && <Notice tone="ok">{t('saved')}</Notice>}
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <TextField label={t('contactName')} name="contactName" required defaultValue={initial.contactName} error={m(state.fields?.contactName)} />
      <TextField label={t('phone')} name="phone" type="tel" required defaultValue={initial.phone} error={m(state.fields?.phone ? 'invalid_phone' : undefined)} />
      <TextField label={t('address')} name="address" defaultValue={initial.address} />
      <Button type="submit" disabled={pending}>{t('save')}</Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations('account');
  const a = useTranslations('auth');
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-5">
      {state.ok && <Notice tone="ok">{a('passwordSet')}</Notice>}
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <TextField label={t('currentPassword')} name="current" type="password" required autoComplete="current-password" error={m(state.fields?.current)} />
      <TextField label={a('newPassword')} name="password" type="password" required autoComplete="new-password" hint={a('passwordHint')} error={m(state.fields?.password)} />
      <TextField label={a('confirmPassword')} name="confirm" type="password" required autoComplete="new-password" error={m(state.fields?.confirm)} />
      <Button type="submit" variant="secondary" disabled={pending}>{t('changePassword')}</Button>
    </form>
  );
}
