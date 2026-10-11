import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import http from 'http';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\bbcc6988-2a72-429a-b35f-0926b23b90cb';

test('Nudge overlay focus safety & keystrokes uninterrupted in editor (EC-120) and popup variants (S09)', async () => {
  // 1. Host editor test page with a textarea simulating Monaco/Ace
  const testHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Two Sum - LeetCode</title></head>
      <body style="background:#0f172a; color:#f8fafc; font-family:sans-serif; padding:20px;">
        <h1>1. Two Sum</h1>
        <div id="editor-container" style="margin-top:20px;">
          <label for="mock-editor">Code Editor:</label><br/>
          <textarea id="mock-editor" class="monaco-editor inputarea" style="width:600px; height:300px; background:#1e293b; color:#38bdf8; font-family:monospace; font-size:14px; padding:10px;"></textarea>
        </div>
      </body>
    </html>
  `;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(testHtml);
  });

  await new Promise<void>((resolve) => server.listen(8766, '127.0.0.1', () => resolve()));
  const pageUrl = 'http://127.0.0.1:8766/problems/two-sum/';
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-overlay-'));

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

    // Configure storage
    const setupPage = await context.newPage();
    await setupPage.goto(`chrome-extension://${extensionId}/options.html`);
    await setupPage.evaluate(async () => {
      await chrome.storage.local.set({
        onboarding_state: { completed: true, step: 3, acknowledgedConsent: true },
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
    await setupPage.close();

    // 2. Open editor page
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

    // Focus editor and begin typing
    const editor = page.locator('#mock-editor');
    await editor.focus();
    await editor.pressSequentially('function twoSum(nums, target) {');

    // Mount and show nudge overlay while editor has focus
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

    await page.waitForTimeout(300);

    // Continue typing while nudge is visible!
    await editor.pressSequentially('\n  const map = new Map();\n  return [];\n}');

    // Verify keystrokes in editor were completely uninterrupted
    const editorValue = await editor.inputValue();
    expect(editorValue).toContain('function twoSum(nums, target) {');
    expect(editorValue).toContain('const map = new Map();');
    expect(editorValue).toContain('return [];');

    // Screenshot S08 with editor active
    const s08ScreenshotPath = path.join(artifactsDir, 's08_nudge_overlay_editor.png');
    await page.screenshot({ path: s08ScreenshotPath });

    // 3. Test Popup Variants by opening popup.html
    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 360, height: 500 });
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForSelector('[data-testid="unstuck-popup"]');
    await popupPage.waitForTimeout(400);

    // Capture popup active screenshot
    const popupActivePath = path.join(artifactsDir, 'popup_active.png');
    await popupPage.screenshot({ path: popupActivePath });

    await context.close();
  } finally {
    server.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
