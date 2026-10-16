import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Optional dedicated Postgres schema (DATABASE_SCHEMA, e.g. "aspor") so ASPOR can share a
 * database with another app without touching its tables in "public".
 */
export const DB_SCHEMA = (() => {
  const s = process.env.DATABASE_SCHEMA?.trim();
  if (!s) return undefined;
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(s)) throw new Error('DATABASE_SCHEMA must be a lowercase identifier');
  return s;
})();

function create() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! }, DB_SCHEMA ? { schema: DB_SCHEMA } : undefined);
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/** Schema-qualified table name for the few raw SQL queries. */
export const tableRef = (name: string) => `"${DB_SCHEMA ?? 'public'}"."${name}"`;
