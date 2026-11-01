import { defineConfig, devices } from "@playwright/test";
import { hasTestDatabase, testDatabaseUrls } from './tests/helpers/test-database';

const testDb = hasTestDatabase ? testDatabaseUrls() : null;
process.env.ACOFFEE_MAIN_DATABASE_URL ??= process.env.DATABASE_URL ?? '';
process.env.ACOFFEE_MAIN_DIRECT_URL ??= process.env.DIRECT_URL ?? '';
process.env.DATABASE_URL = testDb?.pooled ?? '';
process.env.DIRECT_URL = testDb?.direct ?? '';

export default defineConfig({
  testDir: "./tests",
  testMatch: ['ui/**/*.spec.ts', 'helpers/**/*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3310",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: process.env.ACOFFEE_TEST_PRODUCTION === '1' ? 'npm run start -- --hostname 127.0.0.1 --port 3310' : 'npm run dev -- --hostname 127.0.0.1 --port 3310',
    // Readiness must not depend on the live product database.
    url: "http://127.0.0.1:3310/login",
    reuseExistingServer: false,
    env: { ACOFFEE_E2E: '1', DATABASE_URL: testDb?.pooled ?? '', DIRECT_URL: testDb?.direct ?? '',
      AUTH_SECRET: 'local-test-secret-only-not-for-production-2026', AUTH_URL: 'http://127.0.0.1:3310',
      SMTP_HOST: '127.0.0.1', SMTP_PORT: '3325', SMTP_FROM: 'آ <noreply@acoffee.test>', SMTP_USER: '', SMTP_PASS: '' },
    timeout: 90_000,
  },
});
