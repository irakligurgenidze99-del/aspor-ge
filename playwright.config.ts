import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

fs.mkdirSync('.e2e', { recursive: true });
const PORT = 3100;
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://aspor:aspor_dev@localhost:5432/aspor_test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000, // admin logins wait for a fresh TOTP step (codes are single-use)
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    // Requires a prior `npm run build`. Runs the production server against the TEST database.
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: TEST_DB, EMAIL_PROVIDER: 'console', EMAIL_CAPTURE_FILE: '.e2e/e2e-mail.jsonl', ANTISPAM_MIN_MS: '0', APP_URL: `http://localhost:${PORT}`, ADMIN_NOTIFY_EMAIL: 'ops@example.test', ANTHROPIC_API_KEY: '', ANTHROPIC_MODEL: '' },
  },
});
