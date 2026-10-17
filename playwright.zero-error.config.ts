import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/zero-error',
  timeout: 60000,
  retries: 0,
  workers: 1,
  use: {
    headless: false,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
    },
  ],
});
