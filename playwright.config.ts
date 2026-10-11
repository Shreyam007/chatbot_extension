import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    headless: false,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
});
