import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const zipPath = path.join(rootDir, '.output', 'unstuck-1.0.0-chrome.zip');

let tempExtractDir: string;
let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  expect(fs.existsSync(zipPath)).toBe(true);

  tempExtractDir = path.join(os.tmpdir(), `unstuck-package-smoke-${Date.now()}`);
  fs.mkdirSync(tempExtractDir, { recursive: true });

  // Extract packaged zip archive to temporary testing directory
  execSync(`tar -xf "${zipPath}" -C "${tempExtractDir}"`);

  // Verify core manifest and artifacts exist in extracted package
  expect(fs.existsSync(path.join(tempExtractDir, 'manifest.json'))).toBe(true);
  expect(fs.existsSync(path.join(tempExtractDir, 'icon-16.png'))).toBe(true);
  expect(fs.existsSync(path.join(tempExtractDir, 'icon-128.png'))).toBe(true);
  expect(fs.existsSync(path.join(tempExtractDir, 'sidepanel.html'))).toBe(true);
  expect(fs.existsSync(path.join(tempExtractDir, 'popup.html'))).toBe(true);
  expect(fs.existsSync(path.join(tempExtractDir, 'options.html'))).toBe(true);

  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${tempExtractDir}`,
      `--load-extension=${tempExtractDir}`,
    ],
  });

  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  extensionId = background.url().split('/')[2] || '';
  expect(extensionId).toBeTruthy();
});

test.afterAll(async () => {
  await context?.close();
  try {
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
  } catch {}
});

test.describe('Step 17: Packaged Build Smoke Test (.output/unstuck-1.0.0-chrome.zip)', () => {
  test('1. Options page opens, mounts without errors, and renders settings dashboard', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'load' });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/SETTINGS|API Key|Privacy/i);
    await page.close();
  });

  test('2. Side Panel opens and renders Pedagogical Tutor layout', async () => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 420, height: 750 });
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/Unstuck TUTOR|Hints|Chat|Trace|Progress/i);
    await page.close();
  });

  test('3. Toolbar Popup opens and renders extension status overview', async () => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'load' });

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/Unstuck|Open Side Panel|Settings/i);
    await page.close();
  });

  test('4. Onboarding flow renders when state is uncompleted', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'load' });

    // Clear onboarding state to test initial onboarding view in Side Panel
    await page.evaluate(async () => {
      await chrome.storage.local.set({
        onboarding_state: { completed: false, currentStep: 1 },
      });
    });

    const sidepanel = await context.newPage();
    await sidepanel.setViewportSize({ width: 420, height: 750 });
    await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

    await expect(sidepanel.locator('body')).toContainText(/Step 1 of 3|Stuck\? I'll notice|Unstuck gives you hints|Welcome/i);

    await page.close();
    await sidepanel.close();
  });
});
