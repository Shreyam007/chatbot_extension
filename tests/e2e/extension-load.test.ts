import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('load unpacked extension and capture popup, sidepanel, options screenshots', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Wait for service worker to register
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();
  console.log('Loaded unpacked extension ID:', extensionId);

  // 1. Popup Page
  const popupPage = await context.newPage();
  await popupPage.setViewportSize({ width: 380, height: 520 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'load' });
  const popupTitle = popupPage.locator('h1');
  await expect(popupTitle).toContainText(/UNSTUCK/i);
  await popupPage.screenshot({ path: path.join(artifactsDir, 'popup.png') });
  console.log('Captured popup screenshot');

  // 2. Side Panel Page
  const sidepanelPage = await context.newPage();
  await sidepanelPage.setViewportSize({ width: 420, height: 750 });
  await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });
  const sidepanelHeader = sidepanelPage.locator('header');
  await expect(sidepanelHeader).toContainText(/UNSTUCK/i);
  await sidepanelPage.screenshot({ path: path.join(artifactsDir, 'sidepanel.png') });
  console.log('Captured sidepanel screenshot');

  // 3. Options Page
  const optionsPage = await context.newPage();
  await optionsPage.setViewportSize({ width: 1000, height: 750 });
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'load' });
  const optionsTitle = optionsPage.getByRole('heading', { name: 'Unstuck SETTINGS' });
  await expect(optionsTitle).toContainText(/UNSTUCK SETTINGS/i);
  await optionsPage.screenshot({ path: path.join(artifactsDir, 'options.png') });
  console.log('Captured options screenshot');

  await context.close();
});
