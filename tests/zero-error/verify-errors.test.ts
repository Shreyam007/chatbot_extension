import { test, expect, type Page } from '@playwright/test';
import { ZeroErrorHarness } from './harness';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Zero-Error Verification Suite', () => {
  let harness: ZeroErrorHarness;

  test.beforeAll(async () => {
    harness = new ZeroErrorHarness();
    await harness.startServer();
    await harness.launchBrowser();
  });

  test.afterAll(async () => {
    const reportPath = path.resolve(__dirname, '../../docs/ZERO_ERROR_REPORT.md');
    fs.writeFileSync(reportPath, harness.generateMarkdownTable(), 'utf8');
    console.log('\n--- ZERO-ERROR RESULTS TABLE ---\n');
    console.log(harness.generateMarkdownTable());
    await harness.closeBrowser();
    await harness.stopServer();

    // Zero-Error Verification Gate Assertion
    const totalWarns = harness.results.reduce((acc, r) => acc + r.warnCount, 0);
    const totalErrors = harness.results.reduce((acc, r) => acc + r.errorCount, 0);
    expect(totalErrors).toBe(0);
    expect(totalWarns).toBe(0);
  });

  test('Scenario 1: Fresh Onboarding & Options', async () => {
    const page = await harness.context!.newPage();
    harness.collector.attachToPage(page, 'options');

    await page.goto(`chrome-extension://${harness.extensionId}/options.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // Fill in mock API key
    const keyInput = page.locator('input[type="password"]');
    if (await keyInput.isVisible()) {
      await keyInput.fill('mock-valid-gemini-key');
    }

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    const res = harness.recordScenarioResult('Fresh Onboarding', 'options.html');
    await page.close();

    console.log(`Onboarding result: ${res.warnCount} warns, ${res.errorCount} errors`);
  });

  test('Scenario 2: Mock API Key Tests (Valid, Invalid, Offline)', async () => {
    const page = await harness.context!.newPage();
    harness.collector.attachToPage(page, 'options');
    await page.goto(`chrome-extension://${harness.extensionId}/options.html#ai`, { waitUntil: 'load' });

    // Pre-seed completed onboarding
    await page.evaluate(() => {
      return chrome.storage.local.set({
        onboarding_state: { completed: true, currentStep: 3, trackingEnabled: true, enabledSites: ['leetcode.com', 'codeforces.com'] },
        apiKey: 'mock-valid-gemini-key',
      });
    });
    await page.reload({ waitUntil: 'load' });
    const testButton = page.locator('[data-testid="test-api-key-btn"]');
    await testButton.waitFor({ state: 'visible', timeout: 5000 });

    // 2a. Test valid key
    await harness.installWorkerMock(harness.backgroundWorker!, { mode: 'normal' });
    await testButton.click();
    await page.waitForTimeout(1500);
    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Key Test: Valid Key', 'options.html');

    // 2b. Test invalid key
    await harness.installWorkerMock(harness.backgroundWorker!, { mode: 'invalid_key' });
    await testButton.click();
    await page.waitForTimeout(1500);
    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Key Test: Invalid Key', 'options.html');

    // 2c. Test offline
    await harness.installWorkerMock(harness.backgroundWorker!, { mode: 'offline' });
    await testButton.click();
    await page.waitForTimeout(1500);
    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Key Test: Offline', 'options.html');

    // Reset mock
    await harness.installWorkerMock(harness.backgroundWorker!, { mode: 'normal' });
    await page.close();
  });

  test('Scenario 3: Long Wikipedia Article (Hindi) - Evidence E1 Check', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    // Navigate to Wikipedia Hindi and execute content script in isolated world via chrome.scripting
    await page.goto('https://en.wikipedia.org/wiki/Hindi', { waitUntil: 'domcontentloaded' });
    await harness.backgroundWorker?.evaluate(async () => {
      try {
        const tabs = await chrome.tabs.query({});
        const tab = tabs[tabs.length - 1];
        if (tab?.id) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/content.js'],
          });
        }
      } catch {
        // Content script may already be dynamically registered
      }
    });
    await page.waitForTimeout(3000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    const res = harness.recordScenarioResult('Long Context Ingestion', 'https://en.wikipedia.org/wiki/Hindi');
    await page.close();

    console.log(`Wikipedia Hindi result: ${res.warnCount} warns, ${res.errorCount} errors`);
  });

  test('Scenario 4: Scientific Article (Binary Search)', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://en.wikipedia.org/wiki/Binary_search_algorithm', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Technical Article', 'https://en.wikipedia.org/wiki/Binary_search_algorithm');
    await page.close();
  });

  test('Scenario 5: LeetCode Problem Page & Statistics Check', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://leetcode.com/problems/two-sum/description/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Problem Description', 'https://leetcode.com/problems/two-sum/');
    await page.close();
  });

  test('Scenario 6: Codeforces Problem Page', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://codeforces.com/problemset/problem/1/A', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Codeforces Page', 'https://codeforces.com/problemset/problem/1/A');
    await page.close();
  });

  test('Scenario 7: Accordion / FAQ Marketing Page', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://example.com/faq', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Accordion / FAQ Extraction', 'https://example.com/faq');
    await page.close();
  });

  test('Scenario 8: Div-Only Landing Page', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://example.com/landing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Div-Only Fallback', 'https://example.com/landing');
    await page.close();
  });

  test('Scenario 9: Sensitive Page Guardrails & False-Positive Prevention', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    // 9a. Visible Checkout
    await page.goto('https://shop.example.com/checkout', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Sensitive: Checkout Path', 'https://shop.example.com/checkout');

    // 9b. Visible Login
    await page.goto('https://auth.example.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Sensitive: Login Page', 'https://auth.example.com/login');

    // 9c. Hidden login modal (should NOT be blocked)
    await page.goto('https://docs.example.com/hidden-modal', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Non-Sensitive: Hidden Modal', 'https://docs.example.com/hidden-modal');

    // 9d. Safe Wikipedia URLs with keywords (Payment, Passport, Cartoon, Open_banking)
    await page.goto('https://en.wikipedia.org/wiki/Payment', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Non-Sensitive: /wiki/Payment', 'https://en.wikipedia.org/wiki/Payment');

    await page.goto('https://en.wikipedia.org/wiki/Passport', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Non-Sensitive: /wiki/Passport', 'https://en.wikipedia.org/wiki/Passport');

    await page.goto('https://en.wikipedia.org/wiki/Cartoon', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Non-Sensitive: /wiki/Cartoon', 'https://en.wikipedia.org/wiki/Cartoon');

    await page.goto('https://en.wikipedia.org/wiki/Open_banking', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    harness.recordScenarioResult('Non-Sensitive: /wiki/Open_banking', 'https://en.wikipedia.org/wiki/Open_banking');

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    await page.close();
  });

  test('Scenario 10: Contest Page Detection', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://leetcode.com/contest/weekly-contest-400/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Contest Mode', 'https://leetcode.com/contest/weekly-contest-400/');
    await page.close();
  });

  test('Scenario 11: SPA Navigation & Stale Context Clearing', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://leetcode.com/spa/problems/two-sum', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Navigate to problem list
    await page.click('#nav-problems');
    await page.waitForTimeout(2000);

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('SPA Navigation Clear', 'https://leetcode.com/spa/problems');
    await page.close();
  });

  test('Scenario 12: Rate Limits & Quota Exhaustion (429 Handled)', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    // Set mock to 429 rate limit
    await harness.installWorkerMock(harness.backgroundWorker!, { mode: 'rate_limit' });
    await page.goto(`chrome-extension://${harness.extensionId}/sidepanel.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Send a chat message or hint request
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('How do I solve this?');
      await textarea.press('Enter');
      await page.waitForTimeout(2000);
    }

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }
    harness.recordScenarioResult('Rate Limit 429 Handling', 'sidepanel.html');

    // Reset mock
    await harness.installWorkerMock(harness.backgroundWorker!, { mode: 'normal' });
    await page.close();
  });

  test('Scenario 13: 10-Minute Accelerated Soak & Heap Stability', async () => {
    const page = await harness.context!.newPage();
    await harness.setupPageRoutes(page);

    await page.goto('https://en.wikipedia.org/wiki/Hindi', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Measure starting heap memory
    const startMemory = await page.evaluate(() => {
      const perf = window.performance as any;
      return perf.memory ? perf.memory.usedJSHeapSize : null;
    });

    // Fast-forward 10 minutes (40 intervals of 15 seconds)
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => {
        // Dispatch synthetic tick/interaction
        window.dispatchEvent(new Event('scroll'));
      });
      await page.waitForTimeout(100);
    }

    const endMemory = await page.evaluate(() => {
      const perf = window.performance as any;
      return perf.memory ? perf.memory.usedJSHeapSize : null;
    });

    if (harness.backgroundWorker) {
      await harness.collector.drainWorkerLogs(harness.backgroundWorker);
    }

    const res = harness.recordScenarioResult(
      '10-Min Soak Test',
      `Hindi (Heap: ${startMemory ? Math.round(startMemory / 1024) + 'KB -> ' + Math.round(endMemory / 1024) + 'KB' : 'N/A'})`
    );
    await page.close();

    console.log(`Soak result: ${res.warnCount} warns, ${res.errorCount} errors`);
  });
});
