import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { clientIpHash } from './request';

export async function audit(actorId: string | null, action: string, entityType?: string, entityId?: string, meta?: Prisma.InputJsonValue) {
  let ipHash: string | undefined;
  try {
    ipHash = await clientIpHash();
  } catch {
    ipHash = undefined; // outside request scope (scripts)
  }
  await db.auditLog.create({ data: { actorId, action, entityType, entityId, meta, ipHash } });
}
