import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Migrations use the direct (non-pooled) URL when available; the app uses DATABASE_URL (pooled).
// DATABASE_SCHEMA (optional) isolates ASPOR in its own Postgres schema inside a shared database.
function migrationUrl() {
  const raw = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '';
  const schema = process.env.DATABASE_SCHEMA?.trim();
  if (!raw || !schema) return raw;
  const u = new URL(raw);
  u.searchParams.set('schema', schema);
  return u.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: migrationUrl() },
});
