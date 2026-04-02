import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // tests must run in order
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // sequential - tests depend on each other
  reporter: [
    ['html', { outputFolder: 'e2e/report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://dms-inspection.netlify.app',
    screenshot: 'on', // screenshot every step
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
