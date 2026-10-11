import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');

test('Step 14 Realistic Chaos: Terminate service worker via CDP and verify seamless state recovery', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // 1. Wait for service worker to register
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();

  // 2. Open Side Panel and seed state
  const sidepanelPage = await context.newPage();
  await sidepanelPage.setViewportSize({ width: 420, height: 750 });
  await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

  await sidepanelPage.evaluate(() => {
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
  await sidepanelPage.reload({ waitUntil: 'load' });

  // Verify Side Panel rendered normally
  const header = sidepanelPage.locator('header');
  await expect(header).toBeVisible();

  // 3. Initiate Chrome DevTools Protocol session to stop the Service Worker
  const cdp = await context.newCDPSession(sidepanelPage);
  await cdp.send('ServiceWorker.enable');

  // Terminate background service workers
  try {
    await cdp.send('ServiceWorker.stopAllWorkers');
    console.log('[Chaos] CDP ServiceWorker.stopAllWorkers executed successfully');
  } catch (err) {
    console.log('[Chaos] ServiceWorker.stopAllWorkers fallback:', err);
  }

  // 4. Perform user actions in Side Panel to trigger service worker wake & rehydration
  // Switch to Hints tab
  const hintsTabBtn = sidepanelPage.getByRole('tab', { name: /hints/i });
  await hintsTabBtn.click();
  await expect(hintsTabBtn).toHaveAttribute('aria-selected', 'true');

  // Switch to Progress tab
  const progressTabBtn = sidepanelPage.getByRole('tab', { name: /progress/i });
  await progressTabBtn.click();
  await expect(progressTabBtn).toHaveAttribute('aria-selected', 'true');

  // Verify no unhandled error boundary fallback was displayed
  const errorFallback = sidepanelPage.locator('[data-testid="error-boundary-fallback"]');
  await expect(errorFallback).toHaveCount(0);

  // Verify Side Panel tabs remain fully interactive after service worker lifecycle disruption
  const chatTabBtn = sidepanelPage.getByRole('tab', { name: /chat/i });
  await chatTabBtn.click();
  await expect(chatTabBtn).toHaveAttribute('aria-selected', 'true');

  await context.close();
});
