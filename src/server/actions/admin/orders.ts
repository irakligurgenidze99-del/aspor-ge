'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '../../auth/guards';
import { audit } from '../../audit';
import { syncOrder } from '../../services/shop';

const MANUAL = { FULFILLED: ['PAID'], CANCELLED: ['PENDING_PAYMENT', 'FAILED', 'PAID'], PAID: ['FULFILLED'] } as const;

/** Manual status changes. Refunds are made in the BOG merchant panel and then synced. */
export async function orderStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const to = String(fd.get('status')) as keyof typeof MANUAL;
  if (!(to in MANUAL)) throw new Error('invalid status');
  const o = await db.order.findUniqueOrThrow({ where: { id } });
  if (!(MANUAL[to] as readonly string[]).includes(o.status)) throw new Error('transition not allowed');
  await db.order.update({ where: { id }, data: { status: to } });
  await audit(admin.id, 'order.status', 'Order', id, { from: o.status, to, manual: true });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath('/admin/orders');
}

export async function orderNoteAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  const note = String(fd.get('note') ?? '').trim().slice(0, 4000);
  await db.order.update({ where: { id }, data: { adminNote: note || null } });
  await audit(admin.id, 'order.note', 'Order', id);
  revalidatePath(`/admin/orders/${id}`);
}

export async function orderSyncAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get('id'));
  await syncOrder(id);
  await audit(admin.id, 'order.sync', 'Order', id);
  revalidatePath(`/admin/orders/${id}`);
}
