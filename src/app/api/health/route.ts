import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Liveness/readiness. Reveals no configuration values — only booleans. */
export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const body = {
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
    email: process.env.EMAIL_PROVIDER ?? 'console',
    storage: process.env.STORAGE_PROVIDER ?? 'local',
    translation: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL),
    time: new Date().toISOString(),
  };
  return Response.json(body, { status: dbOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
