import { assertAdmin } from '@/server/auth/guards';
import { toCsv, toXlsx, EXPORT_COLUMNS, TEMPLATE_ROWS } from '@/server/import/export';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
  const fmt = new URL(req.url).searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const headers = { 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="IMPORT_TEMPLATE.${fmt}"` };
  if (fmt === 'csv') return new Response(toCsv(TEMPLATE_ROWS, EXPORT_COLUMNS), { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } });
  return new Response(new Uint8Array(await toXlsx(TEMPLATE_ROWS, EXPORT_COLUMNS)), { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
}
