import 'dotenv/config';
// Integration tests always use the isolated test database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://aspor:aspor_dev@localhost:5432/aspor_test';
process.env.EMAIL_PROVIDER = 'console';
process.env.STORAGE_PROVIDER = 'local';
process.env.RATE_LIMIT_DISABLED = '0';
(process.env as Record<string, string>).NODE_ENV = 'test';
