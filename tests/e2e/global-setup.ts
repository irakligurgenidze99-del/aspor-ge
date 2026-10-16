import { execSync } from 'node:child_process';
import fs from 'node:fs';

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://aspor:aspor_dev@localhost:5432/aspor_test' };
  execSync('npx tsx --conditions=react-server tests/e2e/fixtures.ts', { stdio: 'inherit', env });
  fs.mkdirSync('.e2e', { recursive: true });
  fs.writeFileSync('.e2e/e2e-mail.jsonl', '');
}
