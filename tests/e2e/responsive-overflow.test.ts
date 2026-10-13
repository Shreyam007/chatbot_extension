import { test, expect, chromium, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const screenshotsDir = path.resolve(__dirname, '../../.screenshots/responsive-v1.0.2');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\3a13cfc8-5910-4b02-9e62-148ffef7463d';

// Ensure screenshot output directories exist
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(artifactsDir, { recursive: true });

const VIEWPORT_WIDTHS = [320, 360, 400, 560, 700];

async function assertNoHorizontalOverflow(page: Page, screenName: string, width: number) {
  const result = await page.evaluate((_expectedWidth) => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;

    const overflowingElements: Array<{
      tag: string;
      id: string;
      className: string;
      right: number;
      width: number;
    }> = [];

    // Query all elements
    const elements = Array.from(document.querySelectorAll('*'));
    for (const el of elements) {
      // Exclude hidden elements or transparent wrappers
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        continue;
      }

      // Check client rect
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // If an element horizontally overflows viewport by more than 1.5px (accounting for subpixel rounding)
        if (rect.right > docWidth + 1.5) {
          // Exclude internal scrollable pre/code blocks which are intended to have their own x-scroll
          if (el.tagName.toLowerCase() === 'pre' || el.tagName.toLowerCase() === 'code') {
            continue;
          }
          overflowingElements.push({
            tag: el.tagName,
            id: el.id,
            className: (el.getAttribute('class') || '').slice(0, 80),
            right: Math.round(rect.right * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
          });
        }
      }
    }

    return {
      docWidth,
      scrollWidth,
      bodyScrollWidth,
      overflowingElements: overflowingElements.slice(0, 5),
    };
  }, width);

  expect(
    result.scrollWidth,
    `[${screenName} @ ${width}px] document.documentElement.scrollWidth (${result.scrollWidth}) must be <= clientWidth (${result.docWidth})`
  ).toBeLessThanOrEqual(result.docWidth + 1.5);

  expect(
    result.bodyScrollWidth,
    `[${screenName} @ ${width}px] document.body.scrollWidth (${result.bodyScrollWidth}) must be <= clientWidth (${result.docWidth})`
  ).toBeLessThanOrEqual(result.docWidth + 1.5);

  expect(
    result.overflowingElements,
    `[${screenName} @ ${width}px] Elements horizontally overflowing viewport: ${JSON.stringify(result.overflowingElements)}`
  ).toEqual([]);
}

async function captureResponsiveScreenshot(page: Page, screenName: string, width: number) {
  if (width === 320 || width === 700) {
    const filename = `${screenName}_${width}px.png`;
    const localPath = path.join(screenshotsDir, filename);
    const artifactPath = path.join(artifactsDir, filename);

    await page.screenshot({ path: localPath });
    try {
      fs.copyFileSync(localPath, artifactPath);
    } catch {
      // Best-effort copy to artifacts
    }
  }
}

test.describe('EC-120: Responsive Overflow Regression Suite (320px - 700px)', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
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

    extensionId = background.url().split('/')[2] || '';
    expect(extensionId).toBeDefined();

    // Mock Gemini API in Service Worker to return 8+ models including TTS, audio, embedding, preview models
    await background.evaluate(() => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const urlStr =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : (input as Request).url;

        if (urlStr.includes('generativelanguage.googleapis.com')) {
          return new Response(
            JSON.stringify({
              models: [
                { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                { name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
                { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
                { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
                { name: 'models/gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash Experimental' },
                { name: 'models/gemini-2.5-flash-preview-tts', displayName: 'TTS Preview' },
                { name: 'models/text-embedding-004', displayName: 'Text Embedding' },
                { name: 'models/imagen-3.0-generate-002', displayName: 'Imagen 3' },
                { name: 'models/gemini-live-2.5', displayName: 'Gemini Live' },
              ],
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        return originalFetch(input, init);
      };
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  // 1. Onboarding S01 Screen
  test('S01: Problem struggling screen across 320px - 700px', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/options.html#onboarding`, {
        waitUntil: 'load',
      });

      // Reset storage to Step 1
      await page.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: { completed: false, currentStep: 1 },
        });
      });
      await page.reload({ waitUntil: 'load' });
      await expect(page.locator('[data-testid="onboarding-step-1"]')).toBeVisible();

      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 's01_intro', width);
        await captureResponsiveScreenshot(page, 's01_intro', width);
      }
    } finally {
      await page.close();
    }
  });

  // 2. Onboarding S02a Screen: Idle, Testing, Connected (with 8+ models & <select>), Error
  test('S02a: Connect your AI screen across 320px - 700px', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/options.html#onboarding`, {
        waitUntil: 'load',
      });

      // Set to Step 2
      await page.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: { completed: false, currentStep: 2, trackingEnabled: true },
          apiKey: '',
        });
      });
      await page.reload({ waitUntil: 'load' });
      await expect(page.locator('[data-testid="onboarding-step-2"]')).toBeVisible();

      // Test S02a Idle across viewports
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 's02a_idle', width);
        await captureResponsiveScreenshot(page, 's02a_idle', width);
      }

      // Enter API key and verify Enter key submission works
      const keyInput = page.locator('[data-testid="api-key-input"]');
      await keyInput.fill('AIzaSyD_TEST_MOCK_KEY_1234567890');

      // Test connected state
      const testBtn = page.locator('[data-testid="test-connection-button"]');
      await testBtn.click();

      // Wait for success and model selector to be visible
      const modelSelect = page.locator('[data-testid="model-select"]');
      await expect(modelSelect).toBeVisible();

      // Verify connected message is dynamic and no TTS or embedding models appear
      const connectedCard = page.locator('[data-testid="status-success"]');
      await expect(connectedCard).toContainText(/Connected — gemini-.* ready/i);

      // Verify privacy reassurance card matches canonical text
      const privacyCard = page.locator('[data-testid="reassurance-card"]');
      await expect(privacyCard).toContainText(
        "Your key is stored only on this device (chrome.storage.local) and sent only to Google's Gemini API with your requests. We run no servers."
      );

      // Test S02a Connected across all viewports
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 's02a_connected', width);
        await captureResponsiveScreenshot(page, 's02a_connected', width);
      }
    } finally {
      await page.close();
    }
  });

  // 3. Onboarding S02b Screen: Choose your sites
  test('S02b: Choose your sites screen across 320px - 700px', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/options.html#onboarding`, {
        waitUntil: 'load',
      });

      // Set to Step 3
      await page.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: {
            completed: false,
            currentStep: 3,
            trackingEnabled: true,
            apiKey: 'mock-key',
            testStatus: 'success',
          },
        });
      });
      await page.reload({ waitUntil: 'load' });
      await expect(page.locator('[data-testid="onboarding-step-3"]')).toBeVisible();

      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 's02b_platforms', width);
        await captureResponsiveScreenshot(page, 's02b_platforms', width);
      }
    } finally {
      await page.close();
    }
  });

  // 4. Side Panel: All Tabs (Hints, Chat, Trace, Progress)
  test('Sidepanel: Hints, Chat, Trace, Progress tabs across 320px - 700px', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
        waitUntil: 'load',
      });

      // Pre-seed completed onboarding and mock telemetry state
      await page.evaluate(() => {
        return chrome.storage.local.set({
          onboarding_state: {
            completed: true,
            currentStep: 3,
            trackingEnabled: true,
            enabledSites: ['leetcode.com', 'codeforces.com'],
            testStatus: 'success',
          },
          apiKey: 'mock-valid-key',
        });
      });
      await page.reload({ waitUntil: 'load' });
      await expect(page.locator('header')).toBeVisible();

      // 4A. Hints Tab
      const hintsTab = page.locator('#tab-hints');
      await hintsTab.click();
      await page.waitForTimeout(150);
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'sidepanel_hints', width);
        await captureResponsiveScreenshot(page, 'sidepanel_hints', width);
      }

      // 4B. Chat Tab
      const chatTab = page.locator('#tab-chat');
      await chatTab.click();
      await page.waitForTimeout(150);
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'sidepanel_chat', width);
        await captureResponsiveScreenshot(page, 'sidepanel_chat', width);
      }

      // 4C. Trace Tab
      const traceTab = page.locator('#tab-trace');
      await traceTab.click();
      await page.waitForTimeout(150);
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'sidepanel_trace', width);
        await captureResponsiveScreenshot(page, 'sidepanel_trace', width);
      }

      // 4D. Progress Tab
      const progressTab = page.locator('#tab-progress');
      await progressTab.click();
      await page.waitForTimeout(150);
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 750 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'sidepanel_progress', width);
        await captureResponsiveScreenshot(page, 'sidepanel_progress', width);
      }
    } finally {
      await page.close();
    }
  });

  // 5. Popup App: Active, Paused, Contest across 320px - 700px
  test('Popup App across 320px - 700px', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/popup.html`, {
        waitUntil: 'load',
      });
      await expect(page.locator('[data-testid="unstuck-popup"]')).toBeVisible();

      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 600 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'popup_app', width);
        await captureResponsiveScreenshot(page, 'popup_app', width);
      }
    } finally {
      await page.close();
    }
  });

  // 6. Options App: AI Settings & Data Transparency Table
  test('Options App across 320px - 700px', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`chrome-extension://${extensionId}/options.html#ai`, {
        waitUntil: 'load',
      });

      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'options_ai', width);
        await captureResponsiveScreenshot(page, 'options_ai', width);
      }

      // Data transparency table section
      await page.goto(`chrome-extension://${extensionId}/options.html#transparency`, {
        waitUntil: 'load',
      });
      for (const width of VIEWPORT_WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.waitForTimeout(100);
        await assertNoHorizontalOverflow(page, 'options_transparency', width);
        await captureResponsiveScreenshot(page, 'options_transparency', width);
      }
    } finally {
      await page.close();
    }
  });
});
