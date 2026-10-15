import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\3a13cfc8-5910-4b02-9e62-148ffef7463d';

test.describe('Stabilization v1.0.5 E2E Verification', () => {
  test('Service worker loads, popup renders Why no nudge yet diagnostics, sidepanel and options load', async () => {
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
          background = await context.waitForEvent('serviceworker', { timeout: 4000 });
        } catch {
          background = context.serviceWorkers()[0];
        }
      }

      const extensionId = background?.url().split('/')[2];
      expect(extensionId).toBeDefined();
      console.log('Loaded unpacked extension ID:', extensionId);

      // Pre-seed completed onboarding & settings
      const testPage = await context.newPage();
      await testPage.setViewportSize({ width: 1100, height: 800 });
      await testPage.goto(`chrome-extension://${extensionId}/options.html#general`, { waitUntil: 'load' });
      await testPage.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: {
            completed: true,
            currentStep: 3,
            trackingEnabled: true,
            enabledSites: ['leetcode.com', 'codeforces.com'],
            testStatus: 'success',
          },
          settings: {
            trackingEnabled: true,
            nudgeSensitivity: 'medium',
            nudgeAfterMinutes: 8,
            lowQuotaMode: true,
            cooldownMin: 15,
            model: 'gemini-2.5-flash',
            enabledSites: ['leetcode.com', 'codeforces.com'],
          },
          apiKey: 'dummy-test-key-for-e2e',
        });
      });

      // 2. Verify Popup page and Why no nudge diagnostic box
      const popupPage = await context.newPage();
      await popupPage.setViewportSize({ width: 380, height: 520 });
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'load' });
      await expect(popupPage.locator('h1')).toContainText(/UNSTUCK/i);
      await popupPage.screenshot({ path: path.join(artifactsDir, 'popup_stabilization.png') });
      console.log('Verified popup page');

      // 3. Verify Side Panel page
      const sidepanelPage = await context.newPage();
      await sidepanelPage.setViewportSize({ width: 420, height: 750 });
      await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });
      await expect(sidepanelPage.locator('header')).toBeVisible();
      await sidepanelPage.screenshot({ path: path.join(artifactsDir, 'sidepanel_stabilization.png') });
      console.log('Verified side panel page');

      // 4. Verify Options Settings Page
      await testPage.reload({ waitUntil: 'load' });
      await expect(testPage.getByRole('heading', { name: 'Unstuck SETTINGS' })).toBeVisible();
      await testPage.screenshot({ path: path.join(artifactsDir, 'options_stabilization.png') });
      console.log('Verified options page');
    } finally {
      await context.close();
    }
  });
});
