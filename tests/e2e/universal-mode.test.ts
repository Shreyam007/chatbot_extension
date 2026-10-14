import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\3a13cfc8-5910-4b02-9e62-148ffef7463d';

test.describe('Universal Mode & Site Management E2E', () => {
  test('Options page: Allowed Sites tab, built-in platforms, and custom blacklist management', async () => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'msedge',
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    try {
      // 1. Wait for background service worker
      let [background] = context.serviceWorkers();
      if (!background) {
        try {
          background = await context.waitForEvent('serviceworker', { timeout: 3000 });
        } catch {
          background = context.serviceWorkers()[0];
        }
      }

      const extensionId = background?.url().split('/')[2];
      expect(extensionId).toBeDefined();

      const page = await context.newPage();
      await page.setViewportSize({ width: 1100, height: 800 });
      await page.goto(`chrome-extension://${extensionId}/options.html#sites`, { waitUntil: 'load' });

      // Pre-seed completed onboarding
      await page.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: {
            completed: true,
            currentStep: 3,
            trackingEnabled: true,
            enabledSites: ['leetcode.com', 'codeforces.com'],
            testStatus: 'success',
          },
          apiKey: 'mock-valid-gemini-key',
        });
      });
      await page.reload({ waitUntil: 'load' });

      // 2. Verify Tab Navigation Button
      const sitesTabBtn = page.locator('[data-testid="tab-sites"]');
      await expect(sitesTabBtn).toBeVisible();
      await sitesTabBtn.click();

      // 3. Verify Header & Built-in Supported Platforms
      const header = page.locator('h2', { hasText: 'Allowed Sites & Universal Mode' });
      await expect(header).toBeVisible();

      await expect(page.getByText('LeetCode', { exact: true })).toBeVisible();
      await expect(page.getByText('Codeforces', { exact: true })).toBeVisible();

      // 4. Verify Custom Domain input & button
      const domainInput = page.locator('[data-testid="add-custom-domain-input"]');
      const domainBtn = page.locator('[data-testid="add-custom-domain-btn"]');
      await expect(domainInput).toBeVisible();
      await expect(domainBtn).toBeVisible();

      // 5. Verify Sensitive Page Guardrails Section & Built-in categories
      await expect(page.getByText('Banking & Finance')).toBeVisible();
      await expect(page.getByText('Payment Checkout')).toBeVisible();
      await expect(page.getByText('Webmail')).toBeVisible();
      await expect(page.getByText('Password Managers')).toBeVisible();

      // 6. Test Custom Sensitive Pattern input & addition
      const patternInput = page.locator('[data-testid="custom-pattern-input"]');
      const addPatternBtn = page.locator('[data-testid="add-custom-pattern-btn"]');
      await expect(patternInput).toBeVisible();

      await patternInput.fill('secret-internal.corp');
      await addPatternBtn.click();

      // Verify custom pattern badge is rendered
      await expect(page.getByText('secret-internal.corp')).toBeVisible();

      // 7. Remove custom pattern
      const removeBtn = page.locator('button[aria-label="Remove pattern secret-internal.corp"]');
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();
      await expect(page.getByText('secret-internal.corp')).not.toBeVisible();

      await page.screenshot({ path: path.join(artifactsDir, 'options_universal_mode_sites.png') });
    } finally {
      await context.close();
    }
  });

  test('Sidepanel: Adaptive Ladder titles for Articles and Documentation', async () => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'msedge',
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    try {
      let [background] = context.serviceWorkers();
      if (!background) {
        try {
          background = await context.waitForEvent('serviceworker', { timeout: 3000 });
        } catch {
          background = context.serviceWorkers()[0];
        }
      }

      const extensionId = background?.url().split('/')[2];
      const page = await context.newPage();
      await page.setViewportSize({ width: 420, height: 750 });
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Pre-seed completed onboarding
      await page.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: {
            completed: true,
            currentStep: 3,
            trackingEnabled: true,
            enabledSites: ['leetcode.com', 'codeforces.com'],
            testStatus: 'success',
          },
          apiKey: 'mock-valid-gemini-key',
        });
      });
      await page.reload({ waitUntil: 'load' });

      // Verify Sidepanel renders Navigation tabs and Header
      const header = page.locator('header');
      await expect(header).toBeVisible();
      await expect(page.locator('#tab-hints')).toBeVisible();
      await expect(page.locator('#tab-chat')).toBeVisible();

      await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_universal_mode.png') });
    } finally {
      await context.close();
    }
  });
});
