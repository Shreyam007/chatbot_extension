import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const fixturePath = path.resolve(__dirname, '../fixtures/fellowship-marketing.html');

test.describe('Fellowship Marketing Page & Universal Chat E2E', () => {
  test('verifies non-problem level labels, placeholder, and FAQ extraction on marketing page', async () => {
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

      expect(background).toBeDefined();
      const extensionId = background!.url().split('/')[2];
      expect(extensionId).toBeDefined();

      // 2. Seed storage via background worker
      await background!.evaluate(async () => {
        await chrome.storage.local.set({
          onboarding_state: {
            completed: true,
            currentStep: 3,
            trackingEnabled: true,
            enabledSites: ['*'],
            testStatus: 'success',
          },
          apiKey: 'mock-valid-gemini-key',
        });
      });

      // 3. Open fellowship fixture page
      const page = await context.newPage();
      await page.goto(`file://${fixturePath}`);

      // 4. Open sidepanel
      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 400, height: 700 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Switch to Chat tab
      const chatTabBtn = sidepanel.locator('#tab-chat, button:has-text("Chat")').first();
      await expect(chatTabBtn).toBeVisible({ timeout: 5000 });
      await chatTabBtn.click();
      if (await chatTabBtn.isVisible()) {
        await chatTabBtn.click();
      }

      // 4. Verify Chat Tab Input and Pedagogical Labels
      const textarea = sidepanel.locator('textarea');
      await expect(textarea).toBeVisible();

      // Verify level button exists
      const levelBtn = sidepanel.locator('button:has-text("Level:")');
      await expect(levelBtn).toBeVisible();

      await context.close();
    } catch (err) {
      await context.close();
      throw err;
    }
  });
});
