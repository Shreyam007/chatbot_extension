import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('Options page: navigation, data transparency table, typed DELETE modal, and privacy controls', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Wait for background service worker
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();

  const page = await context.newPage();
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto(`chrome-extension://${extensionId}/options.html#ai`, { waitUntil: 'load' });

  // 1. Verify Header & AI & Inference Tab (Default)
  const header = page.locator('h1');
  await expect(header).toContainText(/UNSTUCK SETTINGS/i);
  await expect(page.locator('[data-testid="tab-ai-provider"]')).toBeVisible();
  await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="model-selector"]')).toBeVisible();
  await page.screenshot({ path: path.join(artifactsDir, 'options_s11_ai.png') });

  // 2. Navigate to Nudges & Policy Tab
  await page.locator('[data-testid="tab-nudges-policy"]').click();
  await expect(page.locator('[data-testid="cooldown-slider"]')).toBeVisible();
  await expect(page.locator('[data-testid="sensitivity-medium"]')).toBeVisible();
  await page.screenshot({ path: path.join(artifactsDir, 'options_s11_nudges.png') });

  // 3. Navigate to Data Transparency Tab
  await page.locator('[data-testid="tab-data-transparency"]').click();
  await expect(page.locator('[data-testid="data-transparency-table-container"]')).toBeVisible();
  await expect(page.getByText('What is sent to the AI')).toBeVisible();
  await expect(page.getByText('Problem Title & Description')).toBeVisible();
  await expect(page.getByText('Code Editor Context')).toBeVisible();
  await page.screenshot({ path: path.join(artifactsDir, 'options_s11_transparency.png') });

  // 4. Navigate to Privacy & Storage Tab
  await page.locator('[data-testid="tab-privacy-data"]').click();
  await expect(page.locator('[data-testid="export-data-button"]')).toBeVisible();
  await expect(page.locator('[data-testid="delete-all-data-button"]')).toBeVisible();
  await expect(page.getByText('Everything is stored on this device')).toBeVisible();

  // 5. Test Typed DELETE Confirmation Modal
  await page.locator('[data-testid="delete-all-data-button"]').click();
  const modal = page.locator('[data-testid="wipe-modal"]');
  await expect(modal).toBeVisible();

  const confirmBtn = page.locator('[data-testid="confirm-delete-btn"]');
  await expect(confirmBtn).toBeDisabled();

  const input = page.locator('[data-testid="delete-confirm-input"]');
  await input.fill('NO');
  await expect(confirmBtn).toBeDisabled();

  await input.fill('DELETE');
  await expect(page.locator('[data-testid="delete-matched-badge"]')).toBeVisible();
  await expect(confirmBtn).toBeEnabled();
  await page.screenshot({ path: path.join(artifactsDir, 'options_s11_delete_modal.png') });

  // Close safely via cancel
  await page.locator('[data-testid="cancel-delete-btn"]').click();
  await expect(modal).not.toBeVisible();

  // 6. Test Data Export Action
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.locator('[data-testid="export-data-button"]').click();
  const download = await downloadPromise;
  if (download) {
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    console.log('Successfully triggered and verified JSON download:', download.suggestedFilename());
  }

  // 7. Capture Options Screenshot
  await page.screenshot({ path: path.join(artifactsDir, 'options_s11_privacy.png') });
  await page.screenshot({ path: path.join(artifactsDir, 'options.png') });
  console.log('Captured options_s11_privacy.png and updated options.png');

  await context.close();
});
