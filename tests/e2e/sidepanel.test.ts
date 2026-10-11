import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('Step 10 Side Panel: Render all tabs (Chat, Hints, Trace, Progress, S12 Solved) and capture screenshots', async () => {
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

  // Pre-seed completed onboarding for full sidepanel access
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

  // Verify Header loaded
  const header = page.locator('header');
  await expect(header).toContainText(/UNSTUCK/i);

  // 1. Hints Tab (Default)
  await page.waitForTimeout(500);
  const hintsTabBtn = page.locator('#tab-hints');
  await expect(hintsTabBtn).toBeVisible();
  await expect(page.locator('body')).toContainText(/Level 1 of 4|Direction|Confidence/i);
  await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_hints.png') });
  console.log('Captured sidepanel_hints screenshot');

  // Test unlocking next hint (Level 2)
  const nextHintBtn = page.locator('button:has-text("Next hint")');
  if (await nextHintBtn.isVisible()) {
    await nextHintBtn.click();
    await page.waitForTimeout(300);
  }

  // 2. Chat Tab
  const chatTabBtn = page.locator('#tab-chat');
  await chatTabBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('body')).toContainText(/Ask me anything about this page|Explain this problem/i);
  await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_chat.png') });
  console.log('Captured sidepanel_chat screenshot');

  // Click a prompt chip
  const promptChip = page.locator('button:has-text("Explain this problem")');
  if (await promptChip.isVisible()) {
    await promptChip.click();
    await page.waitForTimeout(500);
  }

  // 3. Trace Tab
  const traceTabBtn = page.locator('#tab-trace');
  await traceTabBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('body')).toContainText(/Trace|Explainable AI|Detector Agent/i);
  await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_trace.png') });
  console.log('Captured sidepanel_trace screenshot');

  // 4. Progress Tab
  const progressTabBtn = page.locator('#tab-progress');
  await progressTabBtn.click();
  await page.waitForTimeout(400);
  await expect(page.locator('body')).toContainText(/Solved this week|Hints needed per problem|Topic mastery/i);
  await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_progress.png') });
  console.log('Captured sidepanel_progress screenshot');

  // 5. Test Solved Modal (S12)
  await hintsTabBtn.click();
    await page.waitForTimeout(300);
    const solvedBtn = page.locator('button:has-text("I solved it! 🎉")');
    if (await solvedBtn.isVisible()) {
      await solvedBtn.click();
      await page.waitForTimeout(400);
      await expect(page.locator('body')).toContainText(/Solved. Nice.|Time Taken|Keep Practicing/i);
      await page.screenshot({ path: path.join(artifactsDir, 'sidepanel_solved.png') });
      console.log('Captured sidepanel_solved screenshot');
    }

    // 6. Test Responsive Constraint (320px width)
    await page.setViewportSize({ width: 320, height: 600 });
    await page.waitForTimeout(300);
    await expect(header).toBeVisible();

    await context.close();
});
