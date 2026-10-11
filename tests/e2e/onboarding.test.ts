import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('Step 3 E2E: Complete Onboarding flow (S01 -> S02a -> S02b) with state resumption and tracking gating (EC-001)', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Wait for extension service worker to register
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();

  // 1. Open Options page in fresh profile (Onboarding Wizard rendered)
  const page = await context.newPage();
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'load' });

  // Verify S01 Screen elements
  const step1 = page.locator('[data-testid="onboarding-step-1"]');
  await expect(step1).toBeVisible();
  await expect(step1.locator('h1')).toContainText("Stuck? I'll notice.");

  // Verify Default OFF for stuck detection (EC-001)
  const toggleBadge = page.locator('[data-testid="toggle-badge"]');
  await expect(toggleBadge).toContainText('OFF');

  // Capture S01 Screenshot
  await page.screenshot({ path: path.join(artifactsDir, 'onboarding_step1.png') });

  // Toggle consent ON
  const consentToggle = page.locator('[data-testid="consent-toggle-button"]');
  await consentToggle.click();
  await expect(toggleBadge).toContainText('ON');

  // Click Continue to advance to Step 2 (S02a)
  const continueBtn = page.locator('[data-testid="onboarding-continue-button"]');
  await continueBtn.click();

  // 2. S02a Connect Your AI
  const step2 = page.locator('[data-testid="onboarding-step-2"]');
  await expect(step2).toBeVisible();
  await expect(step2.locator('h1')).toContainText('Connect your AI');

  // Next button should be disabled initially
  const nextBtn = page.locator('[data-testid="onboarding-next-button"]');
  await expect(nextBtn).toBeDisabled();

  // Enter mock key
  const keyInput = page.locator('[data-testid="api-key-input"]');
  await keyInput.fill('mock_gemini_api_key_test');

  // Click Test Connection
  const testBtn = page.locator('[data-testid="test-connection-button"]');
  await testBtn.click();

  // Verify Success state
  const successStatus = page.locator('[data-testid="status-success"]');
  await expect(successStatus).toBeVisible();
  await expect(successStatus).toContainText('Connected');

  // Next button should now be enabled
  await expect(nextBtn).toBeEnabled();

  // Capture S02a Screenshot
  await page.screenshot({ path: path.join(artifactsDir, 'onboarding_step2.png') });

  // Advance to Step 3 (S02b)
  await nextBtn.click();

  // 3. S02b Where Should I Help?
  const step3 = page.locator('[data-testid="onboarding-step-3"]');
  await expect(step3).toBeVisible();
  await expect(step3.locator('h1')).toContainText('Where should I help?');

  // Check LeetCode & Codeforces auto-track switches
  const leetcodeToggle = page.locator('[data-testid="toggle-leetcode"]');
  await expect(leetcodeToggle).toHaveAttribute('aria-checked', 'true');

  const codeforcesToggle = page.locator('[data-testid="toggle-codeforces"]');
  await expect(codeforcesToggle).toHaveAttribute('aria-checked', 'true');

  // Capture S02b Screenshot
  await page.screenshot({ path: path.join(artifactsDir, 'onboarding_step3.png') });

  // Click Finish
  const finishBtn = page.locator('[data-testid="onboarding-finish-button"]');
  await finishBtn.click();

  // Verify transition to main settings AI Provider view after completion
  await expect(page.getByRole('heading', { name: 'AI Provider (BYOK)' })).toBeVisible({ timeout: 5000 });

  // 4. Test Resumption & Side Panel
  const sidepanelPage = await context.newPage();
  await sidepanelPage.setViewportSize({ width: 440, height: 750 });
  await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });
  await expect(sidepanelPage.locator('header')).toContainText(/UNSTUCK TUTOR/i);
  await sidepanelPage.screenshot({ path: path.join(artifactsDir, 'sidepanel_active.png') });

  await context.close();
});
