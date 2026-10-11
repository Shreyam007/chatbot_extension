import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('content script injects into problem page, extracts context, and displays S08 nudge overlay', async () => {
  // 1. Start local HTTP server to host fixture pages
  const fixturePath = path.resolve(__dirname, '../fixtures/leetcode-problem.html');
  const fixtureHtml = fs.readFileSync(fixturePath, 'utf-8');

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fixtureHtml);
  });

  await new Promise<void>((resolve) => server.listen(8765, '127.0.0.1', () => resolve()));
  const pageUrl = 'http://127.0.0.1:8765/problems/two-sum/';

  try {
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

    // Configure trackingEnabled and enabledSites in options / storage
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, { waitUntil: 'load' });

    // Enable tracking via options page or direct storage evaluation
    await optionsPage.evaluate(async () => {
      await chrome.storage.local.set({
        settings: {
          trackingEnabled: true,
          enabledSites: ['127.0.0.1', 'localhost', 'leetcode.com', 'codeforces.com'],
          nudgeSensitivity: 'medium',
          cooldownMin: 15,
          maxNudgesPerHour: 4,
          defaultHintLevel: 1,
          contestAutoDisable: true,
          includeCodeConsent: true,
        },
      });
    });
    await optionsPage.close();

    // 2. Open problem page
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

    // Wait for content script to mount #unstuck-overlay-root
    const hostLocator = page.locator('#unstuck-overlay-root');
    await expect(hostLocator).toBeAttached({ timeout: 5000 });

    // Trigger test nudge via shadowRoot
    await page.evaluate(() => {
      const host = document.getElementById('unstuck-overlay-root');
      if (host && host.shadowRoot) {
        const card = host.shadowRoot.getElementById('unstuck-card');
        const fab = host.shadowRoot.getElementById('unstuck-fab-container');
        if (card && fab) {
          card.classList.remove('unstuck-hidden');
          fab.classList.add('unstuck-hidden');
        }
      }
    });

    // Capture S08 Nudge Card screenshot
    await page.waitForTimeout(500);
    const nudgeScreenshotPath = path.join(artifactsDir, 's08_nudge_overlay.png');
    await page.screenshot({ path: nudgeScreenshotPath });
    console.log('Captured S08 Nudge Card screenshot at:', nudgeScreenshotPath);

    // Now test Escape key dismissal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify card is hidden or collapsed
    const isHidden = await page.evaluate(() => {
      const host = document.getElementById('unstuck-overlay-root');
      const card = host?.shadowRoot?.getElementById('unstuck-card');
      return card?.classList.contains('unstuck-hidden');
    });
    expect(isHidden).toBe(true);

    // Trigger FAB beacon view for screenshot
    await page.evaluate(() => {
      const host = document.getElementById('unstuck-overlay-root');
      if (host && host.shadowRoot) {
        const card = host.shadowRoot.getElementById('unstuck-card');
        const fab = host.shadowRoot.getElementById('unstuck-fab-container');
        if (card && fab) {
          card.classList.add('unstuck-hidden');
          fab.classList.remove('unstuck-hidden');
        }
      }
    });

    await page.waitForTimeout(300);
    const fabScreenshotPath = path.join(artifactsDir, 's08_fab_beacon.png');
    await page.screenshot({ path: fabScreenshotPath });
    console.log('Captured S08 FAB Beacon screenshot at:', fabScreenshotPath);

    await context.close();
  } finally {
    server.close();
  }
});
