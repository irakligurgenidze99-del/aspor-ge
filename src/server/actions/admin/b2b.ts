'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '../../auth/guards';
import { approveApplication, rejectApplication, setPartnerSuspended, resendSetupLink, FlowError } from '../../services/partners';
import { retryEmailNow, processOutbox } from '../../email';
import { audit } from '../../audit';
import type { AState } from './auth';

const flowMsg: Record<string, string> = {
  not_found: 'ჩანაწერი ვერ მოიძებნა.',
  not_pending: 'განაცხადი უკვე განხილულია.',
  email_exists: 'ამ ელფოსტით ანგარიში უკვე არსებობს.',
  company_exists: 'ამ საიდენტიფიკაციო კოდით პარტნიორი უკვე არსებობს.',
  already_active: 'პარტნიორს პაროლი უკვე აქვს.',
};

export async function reviewApplicationAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  try {
    if (fd.get('decision') === 'approve') await approveApplication(id, admin.id);
    else await rejectApplication(id, admin.id, String(fd.get('note') ?? ''));
  } catch (e) {
    return { error: e instanceof FlowError ? flowMsg[e.message] ?? e.message : 'შეცდომა' };
  }
  revalidatePath('/admin/applications');
  revalidatePath(`/admin/applications/${id}`);
  return { ok: true };
}

export async function partnerStatusAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const op = String(fd.get('op'));
  try {
    if (op === 'suspend') await setPartnerSuspended(id, true, admin.id, String(fd.get('reason') ?? ''));
    else if (op === 'reactivate') await setPartnerSuspended(id, false, admin.id);
    else if (op === 'resend') await resendSetupLink(id, admin.id);
  } catch (e) {
    return { error: e instanceof FlowError ? flowMsg[e.message] ?? e.message : 'შეცდომა' };
  }
  revalidatePath(`/admin/partners/${id}`);
  revalidatePath('/admin/partners');
  return { ok: true };
}

const partnerEdit = z.object({ companyName: z.string().trim().min(2).max(160), contactName: z.string().trim().min(2).max(120), phone: z.string().trim().max(30), address: z.string().trim().max(300).optional() });
export async function updatePartnerAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const p = partnerEdit.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: 'შეამოწმეთ ველები.' };
  await db.b2BPartner.update({ where: { id }, data: { ...p.data, address: p.data.address || null } });
  await audit(admin.id, 'partner.update', 'B2BPartner', id);
  revalidatePath(`/admin/partners/${id}`);
  return { ok: true };
}

// ── Partner stores (public directory, independent of B2B accounts) ──
const storeSchema = z.object({
  nameKa: z.string().trim().min(1).max(160), nameEn: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1).max(80), cityEn: z.string().trim().max(80).optional(),
  addressKa: z.string().trim().min(1).max(300), addressEn: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(), mapUrl: z.union([z.literal(''), z.string().trim().url().startsWith('https://')]).optional(),
  sortOrder: z.coerce.number().int().default(0), isActive: z.literal('on').optional(),
});

export async function saveStoreAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const p = storeSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('; ') };
  const d = { ...p.data, isActive: p.data.isActive === 'on', mapUrl: p.data.mapUrl || null, phone: p.data.phone || null, nameEn: p.data.nameEn || null, cityEn: p.data.cityEn || null, addressEn: p.data.addressEn || null };
  const s = id ? await db.partnerStore.update({ where: { id }, data: d }) : await db.partnerStore.create({ data: d });
  await audit(admin.id, id ? 'store.update' : 'store.create', 'PartnerStore', s.id);
  revalidatePath('/admin/stores');
  return { ok: true };
}

export async function deleteStoreAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  await db.partnerStore.delete({ where: { id } });
  await audit(admin.id, 'store.delete', 'PartnerStore', id);
  revalidatePath('/admin/stores');
}

// ── Contact messages ──
export async function messageStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const status = z.enum(['NEW', 'READ', 'ARCHIVED']).parse(fd.get('status'));
  await db.contactMessage.update({ where: { id }, data: { status } });
  await audit(admin.id, 'message.status', 'ContactMessage', id, { status });
  revalidatePath('/admin/messages');
}

// ── Email outbox ──
export async function retryEmailAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  await retryEmailNow(id);
  await audit(admin.id, 'email.retry', 'EmailLog', id);
  revalidatePath('/admin/emails');
}

export async function processOutboxAction() {
  await requireAdmin();
  await processOutbox(50);
  revalidatePath('/admin/emails');
}
