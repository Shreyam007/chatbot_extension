import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('Step 13: Mastery model, BKT calibration, and weak-topic review in Side Panel', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();

  const page = await context.newPage();
  await page.setViewportSize({ width: 420, height: 750 });
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

  // Pre-seed completed onboarding and mastery records in IndexedDB
  await page.evaluate(async () => {
    await chrome.storage.local.set({
      onboarding_state: {
        completed: true,
        currentStep: 3,
        trackingEnabled: true,
        enabledSites: ['leetcode.com', 'codeforces.com'],
        testStatus: 'success',
      },
      apiKey: 'mock-valid-gemini-key',
    });

    const openReq = indexedDB.open('unstuck_db');
    await new Promise<void>((resolve, reject) => {
      openReq.onsuccess = () => {
        const db = openReq.result;
        const tx = db.transaction('mastery', 'readwrite');
        const store = tx.objectStore('mastery');
        store.put({
          topic: 'Arrays & Hashing',
          pKnown: 0.72,
          attempts: 5,
          hintsUsed: 2,
          updatedAt: Date.now(),
        });
        store.put({
          topic: 'Dynamic Programming',
          pKnown: 0.38,
          attempts: 4,
          hintsUsed: 5,
          updatedAt: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      openReq.onerror = () => reject(openReq.error);
    });
  });
  await page.reload({ waitUntil: 'load' });

  // Switch to Progress tab
  const progressTabBtn = page.locator('#tab-progress');
  await expect(progressTabBtn).toBeVisible();
  await progressTabBtn.click();
  await page.waitForTimeout(500);

  // 1. Verify Topic Mastery Section and BKT Calibrated Topics
  await expect(page.getByRole('heading', { name: 'Topic mastery' })).toBeVisible();
  await expect(page.getByText('Calibrated from Bayesian Knowledge Tracing')).toBeVisible();
  await expect(page.getByText('Arrays & Hashing').first()).toBeVisible();
  await expect(page.getByText('Dynamic Programming').first()).toBeVisible();

  // 2. Verify Weak Topics Review Panel
  const reviewPanel = page.locator('[data-testid="weak-topics-review-panel"]');
  await expect(reviewPanel).toBeVisible();
  await expect(page.getByText('Recommended Topic Review')).toBeVisible();

  // 3. Test Focus Weak Toggle Button
  const focusWeakBtn = page.locator('[data-testid="focus-weak-btn"]');
  await expect(focusWeakBtn).toBeVisible();
  await expect(focusWeakBtn).toContainText('Focus weak');

  // Click to filter to weak topics only
  await focusWeakBtn.click();
  await expect(focusWeakBtn).toContainText('Showing weak');
  // High mastery topics (Arrays & Hashing: 72%) should now be hidden
  await expect(page.getByText('Dynamic Programming').first()).toBeVisible();

  // Click to restore full view
  await focusWeakBtn.click();
  await expect(focusWeakBtn).toContainText('Focus weak');
  await expect(page.getByText('Arrays & Hashing').first()).toBeVisible();

  // 4. Capture Mastery Progress Screenshots
  await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_mastery_bkt.png'), fullPage: true });

  await reviewPanel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_mastery_weak_review.png') });
  console.log('Captured sidepanel_mastery_bkt and sidepanel_mastery_weak_review screenshots');

  await context.close();
});
