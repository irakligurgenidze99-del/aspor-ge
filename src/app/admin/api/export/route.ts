import { assertAdmin } from '@/server/auth/guards';
import { exportRows, toCsv, toXlsx, EXPORT_COLUMNS } from '@/server/import/export';
import { audit } from '@/server/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let admin;
  try {
    admin = await assertAdmin();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
  const fmt = new URL(req.url).searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const rows = await exportRows();
  await audit(admin.id, 'export.products', 'Product', undefined, { format: fmt, count: rows.length });
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="aspor-products-${stamp}.${fmt}"`, 'X-Robots-Tag': 'noindex' };
  if (fmt === 'csv') return new Response(toCsv(rows, EXPORT_COLUMNS), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } });
  return new Response(new Uint8Array(await toXlsx(rows, EXPORT_COLUMNS)), { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
}
