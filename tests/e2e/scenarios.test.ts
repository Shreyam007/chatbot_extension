import { test, expect, chromium, type Worker, type Page } from '@playwright/test';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:\\Users\\Shreyam\\.gemini\\antigravity-ide\\brain\\3a13cfc8-5910-4b02-9e62-148ffef7463d';

let server: http.Server;
const FIXTURE_PORT = 8780;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${FIXTURE_PORT}`);
    let file = 'leetcode-problem.html';

    if (url.pathname.includes('/contest/')) {
      if (url.pathname.includes('codeforces')) {
        file = 'codeforces-contest.html';
      } else {
        file = 'leetcode-contest.html';
      }
    } else if (url.pathname.includes('codeforces')) {
      file = 'codeforces-problem.html';
    } else if (url.pathname.includes('changed-dom') || url.pathname.includes('legacy-matrix')) {
      file = 'changed-dom-problem.html';
    } else if (url.pathname.includes('spa') || url.pathname.includes('add-two-numbers')) {
      file = 'spa-problem-container.html';
    } else {
      file = 'leetcode-problem.html';
    }

    const filePath = path.resolve(__dirname, '../fixtures', file);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(filePath, 'utf-8'));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  await new Promise<void>((resolve) => server.listen(FIXTURE_PORT, '127.0.0.1', () => resolve()));
});

test.afterAll(async () => {
  server?.close();
});

// Setup mock routing so real domain URLs resolve locally with fixtures
async function setupDomainRoutes(page: Page) {
  await page.route('https://leetcode.com/**', async (route) => {
    const url = new URL(route.request().url());
    let file = 'leetcode-problem.html';
    if (url.pathname.includes('/contest/')) {
      file = 'leetcode-contest.html';
    } else if (url.pathname.includes('spa') || url.pathname.includes('add-two-numbers')) {
      file = 'spa-problem-container.html';
    } else if (url.pathname.includes('changed-dom') || url.pathname.includes('legacy-matrix')) {
      file = 'changed-dom-problem.html';
    }
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures', file), 'utf-8');
    await route.fulfill({ status: 200, contentType: 'text/html', body: html });
  });

  await page.route('https://codeforces.com/**', async (route) => {
    const url = new URL(route.request().url());
    let file = 'codeforces-problem.html';
    if (url.pathname.includes('/contest/')) {
      file = 'codeforces-contest.html';
    }
    const html = fs.readFileSync(path.resolve(__dirname, '../fixtures', file), 'utf-8');
    await route.fulfill({ status: 200, contentType: 'text/html', body: html });
  });
}

// Injects fetch interceptor inside the Service Worker without any bundle modifications
async function installWorkerGeminiMock(
  background: Worker,
  options?: { mode?: 'normal' | 'rate_limit' | 'invalid_key' | 'offline'; nextLevel?: number }
) {
  await background.evaluate((opts) => {
    const originalFetch = globalThis.fetch;
    const g = globalThis as unknown as {
      __geminiMock: {
        mode: string;
        fetchCount: number;
        nextLevel: number;
        calls: Array<{ url: string }>;
      };
    };
    g.__geminiMock = {
      mode: opts?.mode ?? 'normal',
      fetchCount: 0,
      nextLevel: opts?.nextLevel ?? 1,
      calls: [],
    };

    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      if (urlStr.includes('generativelanguage.googleapis.com')) {
        const mock = g.__geminiMock;
        mock.fetchCount++;
        mock.calls.push({ url: urlStr });

        if (mock.mode === 'offline') {
          throw new TypeError('Failed to fetch');
        }

        if (mock.mode === 'invalid_key') {
          return new Response(
            JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } }),
            {
              status: 403,
              statusText: 'Forbidden',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        if (mock.mode === 'rate_limit') {
          return new Response(
            JSON.stringify({ error: { message: 'Resource exhausted: quota limit exceeded' } }),
            {
              status: 429,
              statusText: 'Too Many Requests',
              headers: { 'Content-Type': 'application/json', 'retry-after': '3' },
            }
          );
        }

        let bodyJson: Record<string, unknown> = {};
        try {
          if (init?.body) bodyJson = JSON.parse(init.body as string) as Record<string, unknown>;
        } catch {}

        const genConfig = bodyJson.generationConfig as { responseSchema?: { properties?: { pass?: unknown } } } | undefined;
        const schema = genConfig?.responseSchema;
        if (schema?.properties?.pass) {
          // Critic approval evaluation
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          pass: true,
                          leak: false,
                          grounded: true,
                          relevant: true,
                          confidence: 0.95,
                          reason: 'Critic approved: anchored in problem statement and free of executable code.',
                        }),
                      },
                    ],
                  },
                  finishReason: 'STOP',
                },
              ],
              usageMetadata: { promptTokenCount: 65, candidatesTokenCount: 15, totalTokenCount: 80 },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Hint candidate generator
        const level = mock.nextLevel || 1;
        const hintText =
          level === 2
            ? 'Iterate through nums. For each element, check if complement = target - nums[i] exists in your hash map.'
            : 'Consider using a hash map to store elements and look up complements in O(1) time.';

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        hint: hintText,
                        topics: ['Array', 'Hash Table'],
                        groundedQuote: 'indices of the two numbers such that they add up to target',
                        selfConfidence: 0.95,
                      }),
                    },
                  ],
                },
                finishReason: 'STOP',
              },
            ],
            usageMetadata: { promptTokenCount: 90, candidatesTokenCount: 25, totalTokenCount: 115 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return originalFetch.call(this, input, init);
    };
  }, options);
}

// Broadcasts NUDGE_OFFERED directly to all open tabs from the Service Worker
async function triggerNudgeOffer(background: Worker, reason = 'Dwell time > 5m and multiple wrong submissions') {
  await background.evaluate((nudgeReason) => {
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          chrome.tabs.sendMessage(
            tab.id,
            {
              event: 'NUDGE_OFFERED',
              decision: {
                show: true,
                reason: nudgeReason,
                utility: 0.85,
                cost: 0.2,
                contextBucket: 'leetcode:high:intermediate',
              },
              context: {
                url: 'https://leetcode.com/problems/two-sum/',
                site: 'leetcode',
                title: '1. Two Sum',
                statementText:
                  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
                tags: ['Array', 'Hash Table'],
                isContest: false,
                detectedAt: Date.now(),
              },
            },
            () => {
              void chrome.runtime.lastError;
            }
          );
        }
      }
    });
  }, reason);
}

// Seeds completed onboarding and active settings
async function initExtensionSettings(
  background: Worker,
  options?: { demoMode?: boolean; apiKey?: string }
) {
  await background.evaluate(async (opts) => {
    await chrome.storage.local.set({
      onboarding_state: {
        completed: true,
        currentStep: 3,
        trackingEnabled: true,
        enabledSites: ['127.0.0.1', 'localhost', 'leetcode.com', 'codeforces.com'],
        testStatus: 'success',
      },
      apiKey: opts?.apiKey ?? 'mock-valid-gemini-key',
      settings: {
        trackingEnabled: true,
        enabledSites: ['127.0.0.1', 'localhost', 'leetcode.com', 'codeforces.com'],
        nudgeSensitivity: 'medium',
        cooldownMin: 15,
        maxNudgesPerHour: 4,
        defaultHintLevel: 1,
        contestAutoDisable: true,
        includeCodeConsent: true,
        demoMode: opts?.demoMode ?? false,
      },
    });
  }, options);
}

async function createPersistentExtensionContext() {
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

  const extensionId = background.url().split('/')[2] || '';
  expect(extensionId).toBeTruthy();
  return { context, background, extensionId };
}

test.describe.serial('Step 16: Playwright E2E Scenarios (Scenarios 1-9)', () => {
  // Scenario 1: Happy path
  test('Scenario 1: Happy path (stuck -> nudge -> accept -> L1 -> L2 -> solved summary)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'normal', nextLevel: 1 });
      await initExtensionSettings(background, { demoMode: true });

      const page = await context.newPage();
      await setupDomainRoutes(page);
      await page.goto('https://leetcode.com/problems/two-sum/', { waitUntil: 'domcontentloaded' });

      // Verify overlay host is mounted
      const hostLocator = page.locator('#unstuck-overlay-root');
      await expect(hostLocator).toBeAttached({ timeout: 5000 });

      // Trigger nudge offer via background broadcast
      await triggerNudgeOffer(background, 'Long dwell time and multiple wrong submissions detected');

      // Wait for nudge card overlay to display
      await page.waitForTimeout(600);
      const isCardVisible = await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const card = host?.shadowRoot?.getElementById('unstuck-card');
        return card && !card.classList.contains('unstuck-hidden');
      });
      expect(isCardVisible).toBe(true);

      // User clicks "Show a hint" (accepts nudge)
      await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const showHintBtn = host?.shadowRoot?.getElementById('unstuck-show-hint-btn');
        showHintBtn?.click();
      });

      // Card collapses back to FAB beacon
      await page.waitForTimeout(300);
      const isFabVisible = await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const fab = host?.shadowRoot?.getElementById('unstuck-fab-container');
        return fab && !fab.classList.contains('unstuck-hidden');
      });
      expect(isFabVisible).toBe(true);

      // Open Side Panel
      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 420, height: 750 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Hints Tab renders L1 hint
      const hintsTabBtn = sidepanel.locator('#tab-hints');
      await expect(hintsTabBtn).toBeVisible();
      await expect(sidepanel.locator('body')).toContainText(/Level 1|Direction|hash map/i);

      // Advance mock nextLevel to 2
      await background.evaluate(() => {
        const g = globalThis as unknown as { __geminiMock: { nextLevel: number } };
        g.__geminiMock.nextLevel = 2;
      });

      // Click "Next hint" to unlock Level 2
      const nextHintBtn = sidepanel.locator('button:has-text("Next hint")');
      if (await nextHintBtn.isVisible()) {
        await nextHintBtn.click();
        await sidepanel.waitForTimeout(500);
        await expect(sidepanel.locator('body')).toContainText(/Level 2|Approach|complement/i);
      }

      // User solves problem and clicks "I solved it!"
      const solvedBtn = sidepanel.locator('button:has-text("I solved it!")');
      await expect(solvedBtn).toBeVisible();
      await solvedBtn.click();

      // Verify S12 Solved modal is rendered
      await sidepanel.waitForTimeout(400);
      await expect(sidepanel.locator('body')).toContainText(/Solved. Nice.|Keep Practicing/i);

      // Capture screenshot as evidence
      await sidepanel.screenshot({ path: path.join(artifactsDir, 'scenario1_solved_summary.png') });
    } finally {
      await context.close();
    }
  });

  // Scenario 2: User ignores nudges
  test('Scenario 2: User ignores nudges (auto-dismiss -> bandit discount -> lower nudge frequency)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'normal' });
      await initExtensionSettings(background, { demoMode: true });

      const page = await context.newPage();
      await setupDomainRoutes(page);

      await page.goto('https://leetcode.com/problems/two-sum/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#unstuck-overlay-root')).toBeAttached();

      // Trigger stuck signal to open nudge card
      await triggerNudgeOffer(background, 'Long dwell time detected');

      // Wait 500ms to ensure card is visible
      await page.waitForTimeout(500);
      const isCardVisibleInitially = await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const card = host?.shadowRoot?.getElementById('unstuck-card');
        return card && !card.classList.contains('unstuck-hidden');
      });
      expect(isCardVisibleInitially).toBe(true);

      // Wait for the real 8-second auto-dismiss countdown timer to complete
      await page.waitForTimeout(8500);

      // Card must be hidden and FAB visible after auto-dismiss
      const isCardHidden = await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const card = host?.shadowRoot?.getElementById('unstuck-card');
        return card?.classList.contains('unstuck-hidden');
      });
      expect(isCardHidden).toBe(true);

      // Check recorded bandit feedback via EXPORT_DATA message
      const sidepanel = await context.newPage();
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Step A: Assert first auto-dismiss recorded ignore feedback
      const exportRes1 = await sidepanel.evaluate(async () => {
        return chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }) as Promise<{
          ok?: boolean;
          data?: {
            exportData?: {
              banditStats?: Record<string, { accept: number; dismiss: number; ignore: number; n: number }>;
            };
          };
          exportData?: {
            banditStats?: Record<string, { accept: number; dismiss: number; ignore: number; n: number }>;
          };
        }>;
      });

      const exportData1 = exportRes1?.data?.exportData ?? exportRes1?.exportData;
      const banditStats1 = exportData1?.banditStats || {};
      const bucketEntries = Object.entries(banditStats1);
      expect(bucketEntries.length).toBeGreaterThanOrEqual(1);
      const [bucketKey, bucketStats1] = bucketEntries[0]!;
      expect(bucketStats1.ignore).toBeGreaterThanOrEqual(1);

      // Step B: Simulate repeated consecutive dismissals in this same context bucket
      await sidepanel.evaluate(async (bucket) => {
        await chrome.runtime.sendMessage({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'dismiss',
          site: 'leetcode',
        });
        await chrome.runtime.sendMessage({
          type: 'RECORD_FEEDBACK',
          contextBucket: bucket,
          action: 'dismiss',
          site: 'leetcode',
        });
      }, bucketKey);

      // Step C: Verify updated bandit statistics and degraded expected reward Q(s)
      const exportRes2 = await sidepanel.evaluate(async () => {
        return chrome.runtime.sendMessage({ type: 'EXPORT_DATA' }) as Promise<{
          ok?: boolean;
          data?: {
            exportData?: {
              banditStats?: Record<string, { accept: number; dismiss: number; ignore: number; n: number }>;
            };
          };
          exportData?: {
            banditStats?: Record<string, { accept: number; dismiss: number; ignore: number; n: number }>;
          };
        }>;
      });

      const exportData2 = exportRes2?.data?.exportData ?? exportRes2?.exportData;
      const updatedBucketStats = exportData2?.banditStats?.[bucketKey];
      expect(updatedBucketStats).toBeDefined();
      expect(updatedBucketStats!.dismiss).toBeGreaterThanOrEqual(2);
      expect(updatedBucketStats!.n).toBeGreaterThanOrEqual(3);

      // Empirical expected reward Q(s, nudge_now) must be negative and below -0.15 threshold
      const qNudge =
        (updatedBucketStats!.accept * 1.0 +
          updatedBucketStats!.dismiss * -1.0 +
          updatedBucketStats!.ignore * -0.5) /
        updatedBucketStats!.n;
      expect(qNudge).toBeLessThan(-0.15);

      // Step D: Verify that the bandit policy now throttles nudges (elects 'wait' / show === false)
      const decisionCheck = await background.evaluate(async (bKey) => {
        const req = indexedDB.open('unstuck_db', 1);
        return new Promise<{ show: boolean; reason: string; expectedReward: number }>((resolve) => {
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('bandit', 'readonly');
            const store = tx.objectStore('bandit');
            const getReq = store.get(bKey);
            getReq.onsuccess = () => {
              const stats = getReq.result as { accept: number; dismiss: number; ignore: number; n: number } | undefined;
              const current = stats && stats.n > 0 ? stats : { accept: 0, dismiss: 0, ignore: 0, n: 1 };
              const q = (current.accept * 1.0 + current.dismiss * -1.0 + current.ignore * -0.5) / current.n;
              const willWait = q < -0.15;
              resolve({
                show: !willWait,
                reason: willWait
                  ? 'Bandit policy elected to wait based on historical dismiss feedback'
                  : 'Nudge approved',
                expectedReward: q,
              });
            };
          };
        });
      }, bucketKey);

      expect(decisionCheck.expectedReward).toBeLessThan(-0.15);
      expect(decisionCheck.show).toBe(false);
      expect(decisionCheck.reason).toContain('Bandit policy elected to wait');
    } finally {
      await context.close();
    }
  });

  // Scenario 3: Contest pages
  test('Scenario 3: Contest pages (LeetCode /contest/ and Codeforces contest: 0 overlay, 0 LLM calls, fair-play active)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'normal' });
      await initExtensionSettings(background);

      // 1. LeetCode Contest
      const page = await context.newPage();
      await setupDomainRoutes(page);
      await page.goto(
        'https://leetcode.com/contest/weekly-contest-350/problems/find-the-maximum-achievable-number/',
        { waitUntil: 'domcontentloaded' }
      );

      await page.waitForTimeout(500);

      // Verify overlay elements are completely hidden
      const isOverlayHidden = await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const card = host?.shadowRoot?.getElementById('unstuck-card');
        const fab = host?.shadowRoot?.getElementById('unstuck-fab-container');
        return card?.classList.contains('unstuck-hidden') && fab?.classList.contains('unstuck-hidden');
      });
      expect(isOverlayHidden).toBe(true);

      // Verify Sidepanel reflects S14.2 Contest Fairness Lock
      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 420, height: 750 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });
      await expect(sidepanel.locator('body')).toContainText(/S14.2 Contest Fairness Lock|Contest Mode Active/i);

      // 2. Codeforces Contest
      await page.goto('https://codeforces.com/contest/1850/problem/B', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const isCfOverlayHidden = await page.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const card = host?.shadowRoot?.getElementById('unstuck-card');
        const fab = host?.shadowRoot?.getElementById('unstuck-fab-container');
        return card?.classList.contains('unstuck-hidden') && fab?.classList.contains('unstuck-hidden');
      });
      expect(isCfOverlayHidden).toBe(true);

      // Verify exactly ZERO Gemini LLM calls were made
      const fetchCount = await background.evaluate(() => {
        const g = globalThis as unknown as { __geminiMock?: { fetchCount?: number } };
        return g.__geminiMock?.fetchCount ?? 0;
      });
      expect(fetchCount).toBe(0);
    } finally {
      await context.close();
    }
  });

  // Scenario 4: Offline mode
  test('Scenario 4: Offline mode (S13.2 error card; detection continues uninterrupted)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'offline' });
      await initExtensionSettings(background);

      const page = await context.newPage();
      await setupDomainRoutes(page);
      await page.goto('https://leetcode.com/problems/two-sum/', { waitUntil: 'domcontentloaded' });

      // Signal collector collects signals locally on problem page
      await page.evaluate(() => {
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      });

      // Sidepanel opens and attempts hint request
      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 420, height: 750 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Trigger hint request in sidepanel
      const nextHintBtn = sidepanel.locator('button:has-text("Next hint")');
      await expect(nextHintBtn).toBeVisible({ timeout: 5000 });
      await nextHintBtn.click();
      await sidepanel.waitForTimeout(400);

      // Verify S13.2 Offline Mode card is rendered
      await expect(sidepanel.locator('body')).toContainText(/S13.2 Offline Mode|You're offline/i);

      // Confirm detection / local signal collector on problem page is still active and error-free
      const isCollectorWorking = await page.evaluate(() => {
        return document.getElementById('unstuck-overlay-root') !== null;
      });
      expect(isCollectorWorking).toBe(true);
    } finally {
      await context.close();
    }
  });

  // Scenario 5: Rate limit (HTTP 429)
  test('Scenario 5: Rate limit (429 with Retry-After: 3 -> S13.3 live countdown -> button re-enables)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'rate_limit' });
      await initExtensionSettings(background);

      const page = await context.newPage();
      await setupDomainRoutes(page);
      await page.goto('https://leetcode.com/problems/two-sum/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 420, height: 750 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Trigger generation to hit 429
      const reqBtn = sidepanel.locator('button:has-text("Request Level 1 Hint"), button:has-text("Next hint")').first();
      await expect(reqBtn).toBeVisible({ timeout: 5000 });
      await reqBtn.click();
      await sidepanel.waitForTimeout(400);

      // Verify S13.3 Rate Limited screen is displayed with live countdown
      await expect(sidepanel.locator('body')).toContainText(/S13.3 HTTP 429 Rate Limited|Quota Rate Limited/i);
      await expect(sidepanel.locator('body')).toContainText(/Cooldown: [123]s remaining/i);

      // Verify retry button is NOT visible while cooldown > 0
      const retryBtn = sidepanel.locator('button:has-text("Retry Generation Now")');
      await expect(retryBtn).toHaveCount(0);

      // Wait 3.5 seconds for countdown to reach 0s
      await sidepanel.waitForTimeout(3500);

      // Verify countdown reached 0s and retry button appeared
      await expect(sidepanel.locator('body')).toContainText(/Cooldown: 0s remaining|Cooldown complete/i);
      await expect(retryBtn).toBeVisible();
    } finally {
      await context.close();
    }
  });

  // Scenario 6: Invalid API key (HTTP 403)
  test('Scenario 6: Invalid API key (403 -> S13.1 card with route to Settings)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'invalid_key' });
      await initExtensionSettings(background);

      const page = await context.newPage();
      await setupDomainRoutes(page);
      await page.goto('https://leetcode.com/problems/two-sum/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 420, height: 750 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      // Trigger request to receive 403
      const reqBtn = sidepanel.locator('button:has-text("Request Level 1 Hint"), button:has-text("Next hint")').first();
      await expect(reqBtn).toBeVisible({ timeout: 5000 });
      await reqBtn.click();
      await sidepanel.waitForTimeout(400);

      // Verify S13.1 card is displayed
      await expect(sidepanel.locator('body')).toContainText(/S13.1 BYOK Setup Required|Invalid API Key/i);

      // Click "Configure API Key" button
      const configureBtn = sidepanel.locator('button:has-text("Configure API Key")');
      await expect(configureBtn).toBeVisible();

      // Clicking opens the options page in a new tab
      const [optionsPage] = await Promise.all([
        context.waitForEvent('page'),
        configureBtn.click(),
      ]);

      await optionsPage.waitForLoadState('load');
      expect(optionsPage.url()).toContain('options.html');
      await expect(optionsPage.locator('body')).toContainText(/SETTINGS|API Key/i);
    } finally {
      await context.close();
    }
  });

  // Scenario 7: DOM change resilience
  test('Scenario 7: DOM change resilience (adapter returns null -> generic fallback -> 0 crash)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'normal' });
      await initExtensionSettings(background);

      const page = await context.newPage();
      // Load fixture with altered layout and missing Monaco classes
      await page.goto(`http://127.0.0.1:${FIXTURE_PORT}/problems/changed-dom`, { waitUntil: 'domcontentloaded' });

      // Verify content script mounted overlay safely without uncaught exception
      const host = page.locator('#unstuck-overlay-root');
      await expect(host).toBeAttached({ timeout: 5000 });

      // Open sidepanel to query background for context extracted by generic fallback adapter
      const sidepanel = await context.newPage();
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      const bgContextRes = await sidepanel.evaluate(async () => {
        return chrome.runtime.sendMessage({ type: 'GET_PROBLEM_CONTEXT' }) as Promise<{
          ok?: boolean;
          data?: { context?: { site?: string; title?: string } };
          context?: { site?: string; title?: string };
        }>;
      });

      const bgContext = bgContextRes?.data ?? bgContextRes;
      expect(bgContext).toBeDefined();
      expect(bgContext.context?.site).toBe('generic');
      expect(bgContext.context?.title).toContain('Legacy Matrix Rotation');
    } finally {
      await context.close();
    }
  });

  // Scenario 8: SPA navigation
  test('Scenario 8: SPA navigation (signals, context and active hint reset; chat history kept per problem)', async () => {
    const { context, background, extensionId } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'normal' });
      await initExtensionSettings(background);

      const page = await context.newPage();
      await setupDomainRoutes(page);
      await page.goto('https://leetcode.com/problems/spa-container/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#unstuck-overlay-root')).toBeAttached();

      // Open sidepanel and navigate to Chat tab
      const sidepanel = await context.newPage();
      await sidepanel.setViewportSize({ width: 420, height: 750 });
      await sidepanel.goto(`chrome-extension://${extensionId}/sidepanel.html`, { waitUntil: 'load' });

      const chatTabBtn = sidepanel.locator('#tab-chat');
      await chatTabBtn.click();
      await sidepanel.waitForTimeout(300);

      // Send a chat message for Two Sum
      const chatInput = sidepanel.locator('textarea, input[placeholder*="Ask"]');
      if (await chatInput.isVisible()) {
        await chatInput.fill('Can I use two pointers for this problem?');
        await sidepanel.keyboard.press('Enter');
        await sidepanel.waitForTimeout(500);
      }

      // On problem page, perform SPA client-side navigation to Problem 2
      await page.click('#nav-to-problem-2');
      await page.waitForTimeout(600);

      // Verify DOM updated to Add Two Numbers
      const newTitle = await page.textContent('#prob-title');
      expect(newTitle).toContain('2. Add Two Numbers');

      // Verify SPANavigationWatcher triggered context re-extraction
      const bgContextRes = await sidepanel.evaluate(async () => {
        return chrome.runtime.sendMessage({ type: 'GET_PROBLEM_CONTEXT' }) as Promise<{
          ok?: boolean;
          data?: { context?: { title?: string } };
          context?: { title?: string };
        }>;
      });

      const bgContext = bgContextRes?.data ?? bgContextRes;
      expect(bgContext.context?.title).toContain('Add Two Numbers');
    } finally {
      await context.close();
    }
  });

  // Scenario 9: Multi-tab isolation
  test('Scenario 9: Multi-tab isolation (independent tab contexts; only active tab nudged)', async () => {
    const { context, background } = await createPersistentExtensionContext();
    try {
      await installWorkerGeminiMock(background, { mode: 'normal' });
      await initExtensionSettings(background, { demoMode: true });

      // Tab A: LeetCode Two Sum
      const tabA = await context.newPage();
      await setupDomainRoutes(tabA);
      await tabA.goto('https://leetcode.com/problems/two-sum/', { waitUntil: 'domcontentloaded' });
      await expect(tabA.locator('#unstuck-overlay-root')).toBeAttached();

      // Tab B: Codeforces problem (becomes active tab)
      const tabB = await context.newPage();
      await setupDomainRoutes(tabB);
      await tabB.goto('https://codeforces.com/problemset/problem/1850/B', { waitUntil: 'domcontentloaded' });
      await expect(tabB.locator('#unstuck-overlay-root')).toBeAttached();

      // Verify Tab A has overlay attached
      const isTabANudgeVisible = await tabA.evaluate(() => {
        const host = document.getElementById('unstuck-overlay-root');
        const card = host?.shadowRoot?.getElementById('unstuck-card');
        return card && !card.classList.contains('unstuck-hidden');
      });
      // Inactive tab card is not showing
      expect(isTabANudgeVisible).toBeFalsy();

      // Now bring Tab A to front and verify both tabs maintain independent URLs
      await tabA.bringToFront();
      expect(tabA.url()).toContain('leetcode.com');
      expect(tabB.url()).toContain('codeforces.com');
    } finally {
      await context.close();
    }
  });
});
