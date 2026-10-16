'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAdmin } from '../../auth/guards';
import { createImportJob, previewImport, commitImport, CommitError, MAX_IMPORT_BYTES } from '../../import/service';
import { ParseError } from '../../import/parse';
import { IMPORT_FIELDS, type Mapping } from '@/lib/import/fields';
import { audit } from '../../audit';
import type { AState } from './auth';

export async function uploadImportAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const file = fd.get('file');
  const mode = fd.get('mode') === 'FULL_CATALOG' ? 'FULL_CATALOG' : 'PARTIAL';
  if (!(file instanceof File) || file.size === 0) return { error: 'აირჩიეთ ფაილი (.xlsx ან .csv).' };
  if (file.size > MAX_IMPORT_BYTES) return { error: 'ფაილი 4MB-ზე დიდია. დიდი კატალოგისთვის გამოიყენეთ CSV ან დაყავით ნაწილებად (partial).' };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: 'მხოლოდ .xlsx ან .csv.' };
  let jobId: string;
  try {
    const job = await createImportJob(Buffer.from(await file.arrayBuffer()), file.name, mode, admin.id);
    jobId = job.id;
  } catch (e) {
    return { error: e instanceof ParseError ? `ფაილის წაკითხვა ვერ მოხერხდა: ${e.message}` : 'ფაილის დამუშავება ვერ მოხერხდა.' };
  }
  redirect(`/admin/imports/${jobId}`);
}

export async function previewImportAction(_: AState, fd: FormData): Promise<AState> {
  await requireAdmin();
  const jobId = String(fd.get('jobId'));
  const job = await db.importJob.findUniqueOrThrow({ where: { id: jobId } });
  const fields: Mapping['fields'] = {};
  for (const f of IMPORT_FIELDS) {
    const v = String(fd.get(`map:${f.key}`) ?? '');
    if (v && job.headers.includes(v)) fields[f.key] = v;
  }
  const specColumns = fd.getAll('spec').map(String).filter((h) => job.headers.includes(h));
  const missing = IMPORT_FIELDS.filter((f) => f.required && !fields[f.key]).map((f) => f.label);
  if (missing.length) return { error: `სავალდებულო ველები არ არის მიბმული: ${missing.join(', ')}` };
  await previewImport(jobId, { fields, specColumns });
  revalidatePath(`/admin/imports/${jobId}`);
  return { ok: true };
}

const commitMsg: Record<string, string> = {
  job_already_processed: 'ეს იმპორტი უკვე დამუშავებულია (განმეორებითი დადასტურება დაბლოკილია).',
  run_preview_first: 'ჯერ გაუშვით შემოწმება (dry run).',
  fix_invalid_rows: 'ფაილში არის არასწორი სტრიქონები — გაასწორეთ და ატვირთეთ თავიდან.',
  stale_preview: 'მონაცემები შეიცვალა შემოწმების შემდეგ — გაუშვით შემოწმება თავიდან.',
  hide_confirmation_mismatch: 'დასამალი SKU-ების რაოდენობა არ ემთხვევა დადასტურებას.',
};

export async function commitImportAction(_: AState, fd: FormData): Promise<AState> {
  const admin = await requireAdmin();
  const jobId = String(fd.get('jobId'));
  if (fd.get('confirm') !== 'on') return { error: 'მონიშნეთ დადასტურების ველი.' };
  const hide = fd.get('confirmHideCount');
  try {
    const r = await commitImport(jobId, admin.id, { confirmHideCount: hide === null ? undefined : Number(hide) });
    revalidatePath(`/admin/imports/${jobId}`);
    return { ok: true, data: { imageErrors: r.imageErrors.length } };
  } catch (e) {
    return { error: e instanceof CommitError ? commitMsg[e.message] ?? e.message : `შეცდომა: ${(e as Error).message}` };
  }
}

export async function cancelImportAction(fd: FormData) {
  const admin = await requireAdmin();
  const jobId = String(fd.get('jobId'));
  await db.importJob.updateMany({ where: { id: jobId, status: 'PREVIEWED' }, data: { status: 'CANCELLED', rawRows: { purged: true } } });
  await audit(admin.id, 'import.cancel', 'ImportJob', jobId);
  revalidatePath('/admin/imports');
  redirect('/admin/imports');
}
