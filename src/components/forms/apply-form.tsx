'use client';
import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { applyAction, type FormState } from '@/server/actions/public';
import { Checkbox, Notice, TextArea, TextField } from '../ui/field';
import { Button } from '../ui/button';
import { Link } from '@/i18n/navigation';
import { useMsg } from './use-msg';

export function ApplyForm({ ticket }: { ticket: string }) {
  const t = useTranslations('apply');
  const locale = useLocale();
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(applyAction, {});
  if (state.ok) {
    return (
      <div role="status" className="border-l-4 border-spark bg-studio p-6" data-testid="apply-success">
        <h2 className="text-xl font-bold">{t('successTitle')}</h2>
        <p className="mt-2 text-graphite">{t('successBody')}</p>
      </div>
    );
  }
  const v = state.values ?? {};
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ft" value={ticket} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <TextField label={t('companyName')} name="companyName" required defaultValue={v.companyName} error={m(f.companyName)} autoComplete="organization" />
      <TextField label={t('companyCode')} name="companyCode" required inputMode="numeric" defaultValue={v.companyCode} error={m(f.companyCode)} hint={t('companyCodeHint')} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label={t('contactName')} name="contactName" required defaultValue={v.contactName} error={m(f.contactName)} autoComplete="name" />
        <TextField label={t('phone')} name="phone" type="tel" required defaultValue={v.phone} error={m(f.phone)} autoComplete="tel" placeholder="+995 5XX XXX XXX" />
      </div>
      <TextField label={t('email')} name="email" type="email" required defaultValue={v.email} error={m(f.email)} autoComplete="email" />
      <TextArea label={t('message')} name="message" defaultValue={v.message} rows={4} />
      <Checkbox name="consent" error={m(f.consent)} label={<>{t('consent')} <Link href="/privacy" className="underline underline-offset-2">{t('privacyLink')}</Link></>} />
      <Button type="submit" size="lg" disabled={pending}>{pending ? t('submitting') : t('submit')}</Button>
    </form>
  );
}
