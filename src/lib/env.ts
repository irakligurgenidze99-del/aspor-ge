import 'server-only';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default('http://localhost:3000'),
  APP_ENCRYPTION_KEY: z.string().min(32, 'APP_ENCRYPTION_KEY must be ≥32 chars'),
  SESSION_SECRET: z.string().min(32),
  // Email
  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  EMAIL_FROM: z.string().default('ASPOR <no-reply@aspor.ge>'),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_NOTIFY_EMAIL: z.string().email().optional(),
  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  // AI translation
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  // Ops
  CRON_SECRET: z.string().optional(),
  ADMIN_MFA_REQUIRED: z.enum(['true', 'false']).default('true'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error('Invalid environment configuration: ' + parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  if (parsed.data.NODE_ENV === 'production') {
    for (const k of ['APP_ENCRYPTION_KEY', 'SESSION_SECRET'] as const) {
      if (parsed.data[k].startsWith('dev-only')) throw new Error(`${k} uses a development placeholder in production`);
    }
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === 'production';
