'use client';
import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { contactAction, type FormState } from '@/server/actions/public';
import { Checkbox, Notice, TextArea, TextField } from '../ui/field';
import { Button } from '../ui/button';
import { useMsg } from './use-msg';

export function ContactForm({ ticket }: { ticket: string }) {
  const t = useTranslations('contact');
  const locale = useLocale();
  const m = useMsg();
  const [state, action, pending] = useActionState<FormState, FormData>(contactAction, {});
  if (state.ok) return <Notice tone="ok"><span data-testid="contact-success">{t('success')}</span></Notice>;
  const v = state.values ?? {};
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Notice tone="error">{m(state.error)}</Notice>}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ft" value={ticket} />
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label={t('name')} name="name" required defaultValue={v.name} error={m(f.name)} autoComplete="name" />
        <TextField label={t('email')} name="email" type="email" required defaultValue={v.email} error={m(f.email)} autoComplete="email" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label={t('phone')} name="phone" type="tel" defaultValue={v.phone} error={m(f.phone)} autoComplete="tel" />
        <TextField label={t('subject')} name="subject" defaultValue={v.subject} />
      </div>
      <TextArea label={t('message')} name="message" required rows={6} defaultValue={v.message} error={m(f.message)} />
      <Checkbox name="consent" label={t('consent')} error={m(f.consent)} />
      <Button type="submit" size="lg" disabled={pending}>{t('submit')}</Button>
    </form>
  );
}
