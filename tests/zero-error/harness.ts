import { chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ErrorCollector } from './collector';
import type { ScenarioResult } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURE_PORT = 8990;

export class ZeroErrorHarness {
  public server?: http.Server;
  public context?: BrowserContext;
  public backgroundWorker?: Worker;
  public extensionId = '';
  public collector = new ErrorCollector();
  public results: ScenarioResult[] = [];
  public pathToExtension: string;

  constructor(extensionPath?: string) {
    const devPath = path.resolve(__dirname, '../../.output/chrome-mv3-dev');
    const prodPath = path.resolve(__dirname, '../../.output/chrome-mv3');
    this.pathToExtension = extensionPath || (fs.existsSync(prodPath) ? prodPath : devPath);
  }

  public async startServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://127.0.0.1:${FIXTURE_PORT}`);
        let file = 'sample-page.html';

        if (url.pathname.includes('/wiki/Hindi') || url.pathname.includes('hindi')) {
          file = 'wikipedia-hindi.html';
        } else if (url.pathname.includes('binary_search') || url.pathname.includes('binary-search')) {
          file = 'wikipedia-binary-search.html';
        } else if (url.pathname.includes('faq') || url.pathname.includes('marketing-accordion')) {
          file = 'marketing-accordion-faq.html';
        } else if (url.pathname.includes('landing') || url.pathname.includes('div-only')) {
          file = 'landing-div-only.html';
        } else if (url.pathname.includes('hidden-login') || url.pathname.includes('hidden-modal')) {
          file = 'hidden-login-modal.html';
        } else if (url.pathname.includes('login') || url.pathname.includes('signin')) {
          file = 'login-page.html';
        } else if (url.pathname.includes('checkout') || url.pathname.includes('cart') || url.pathname.includes('pay')) {
          file = 'checkout-page.html';
        } else if (url.pathname.includes('spa')) {
          file = 'spa-route-change.html';
        } else if (url.pathname.includes('codeforces')) {
          file = url.pathname.includes('contest') ? 'codeforces-contest.html' : 'codeforces-problem.html';
        } else if (url.pathname.includes('solutions')) {
          file = 'leetcode-two-sum-solutions.html';
        } else if (url.pathname.includes('contest')) {
          file = 'leetcode-contest.html';
        } else if (url.pathname.includes('two-sum') || url.pathname.includes('leetcode')) {
          file = 'leetcode-two-sum-description.html';
        } else if (url.pathname.includes('pdf')) {
          file = 'pdf-viewer-placeholder.html';
        } else if (url.pathname.includes('mdn') || url.pathname.includes('reference')) {
          file = 'mdn-reference-page.html';
        } else if (url.pathname.includes('chrome-internal') || url.pathname.includes('internal')) {
          file = 'chrome-internal-mock.html';
        }

        const filePath = path.resolve(__dirname, '../fixtures', file);
        if (fs.existsSync(filePath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(fs.readFileSync(filePath));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      this.server.listen(FIXTURE_PORT, '127.0.0.1', () => resolve());
    });
  }

  public async stopServer(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
    }
  }

  public async launchBrowser(): Promise<void> {
    this.context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${this.pathToExtension}`,
        `--load-extension=${this.pathToExtension}`,
      ],
    });

    let [bg] = this.context.serviceWorkers();
    if (!bg) {
      bg = await this.context.waitForEvent('serviceworker');
    }
    this.backgroundWorker = bg;
    this.extensionId = bg.url().split('/')[2] || '';

    await this.collector.attachToWorker(this.context, bg);
    await this.installWorkerMock(bg);

    // Register universal content scripts for test domains
    await bg.evaluate(async () => {
      try {
        await chrome.scripting.registerContentScripts([
          {
            id: 'universal-test-domains',
            matches: [
              'https://en.wikipedia.org/*',
              'https://example.com/*',
              'https://shop.example.com/*',
              'https://auth.example.com/*',
              'https://docs.example.com/*',
            ],
            js: ['content-scripts/content.js'],
            runAt: 'document_idle',
          },
        ]);
      } catch (e) {
        // Ignored
      }
    });
  }

  public async installWorkerMock(
    worker: Worker,
    opts: { mode?: 'normal' | 'rate_limit' | 'rate_limit_daily' | 'invalid_key' | 'offline' } = {}
  ) {
    await worker.evaluate((options) => {
      const g = globalThis as any;
      g.__geminiMock = {
        mode: options.mode || 'normal',
        fetchCount: 0,
      };

      if (!g.__originalFetch) {
        g.__originalFetch = globalThis.fetch;
      }
      const originalFetch = g.__originalFetch;
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          if (urlStr.includes('generativelanguage.googleapis.com')) {
            g.__geminiMock.fetchCount++;
            const mode = g.__geminiMock.mode;

            if (mode === 'offline') {
              throw new TypeError('Failed to fetch: net::ERR_INTERNET_DISCONNECTED');
            }

            if (mode === 'invalid_key') {
              return new Response(
                JSON.stringify({
                  error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' },
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }

            if (mode === 'rate_limit') {
              return new Response(
                JSON.stringify({
                  error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).', status: 'RESOURCE_EXHAUSTED' },
                }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
              );
            }

            if (mode === 'rate_limit_daily') {
              return new Response(
                JSON.stringify({
                  error: { code: 429, message: 'Daily quota exceeded.', status: 'RESOURCE_EXHAUSTED' },
                }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
              );
            }

            // Normal mock hint response with schema awareness
            let mockData: Record<string, unknown>;
            const bodyText = typeof init?.body === 'string' ? init.body : '';
            if (bodyText.includes('CRITIC') || bodyText.includes('critic') || bodyText.includes('impartial') || bodyText.includes('pedagogy judge')) {
              mockData = {
                pass: true,
                leak: false,
                grounded: true,
                relevant: true,
                confidence: 0.95,
                reason: 'Verified by critic evaluation.',
              };
            } else if (bodyText.includes('LEVEL 4') || bodyText.includes('FULL SOLUTION')) {
              mockData = {
                hint: 'Optimal solution using a hash map for two-sum complement lookup.',
                codeBlock: 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            diff = target - num\n            if diff in seen:\n                return [seen[diff], i]\n            seen[num] = i',
                topics: ['Array', 'Hash Table'],
                groundedQuote: 'nums',
                selfConfidence: 0.95,
              };
            } else {
              mockData = {
                hint: 'Consider how a hash map can help find numbers in O(1) time by storing seen elements.',
                topics: ['Array', 'Hash Table'],
                groundedQuote: 'nums',
                selfConfidence: 0.95,
              };
            }

            const mockPayload = {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify(mockData),
                      },
                    ],
                  },
                },
              ],
            };
            return new Response(JSON.stringify(mockPayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }

          return originalFetch(input, init);
        };
    }, opts);
  }

  public async setupPageRoutes(page: Page) {
    this.collector.attachToPage(page, 'content');

    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === 'chrome-extension:' || url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        return route.continue();
      }

      // Map public domains to local fixture server
      const redirectedUrl = `http://127.0.0.1:${FIXTURE_PORT}${url.pathname}${url.search}`;
      try {
        const resp = await fetch(redirectedUrl);
        const body = await resp.text();
        await route.fulfill({
          status: resp.status,
          contentType: 'text/html; charset=utf-8',
          body,
        });
      } catch {
        await route.continue();
      }
    });
  }

  public recordScenarioResult(scenario: string, pageName: string): ScenarioResult {
    const warns = this.collector.errors.filter((e) => e.level === 'warn');
    const errors = this.collector.errors.filter((e) => e.level === 'error');
    const pageerrors = this.collector.errors.filter((e) => e.level === 'pageerror' || e.level === 'unhandledrejection');

    const result: ScenarioResult = {
      scenario,
      page: pageName,
      warnCount: warns.length,
      errorCount: errors.length,
      pageerrorCount: pageerrors.length,
      firstWarn: warns[0]?.text,
      firstError: errors[0]?.text || pageerrors[0]?.text,
      captured: [...this.collector.errors],
    };

    this.results.push(result);
    this.collector.clear();
    return result;
  }

  public async closeBrowser(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
  }

  public generateMarkdownTable(): string {
    const lines: string[] = [
      '| Scenario | Page / Context | Warns | Errors | PageErrors | First Message |',
      '| :--- | :--- | :---: | :---: | :---: | :--- |',
    ];

    for (const res of this.results) {
      const msg = (res.firstWarn || res.firstError || 'None').replace(/\|/g, '\\|').slice(0, 80);
      lines.push(
        `| ${res.scenario} | ${res.page} | ${res.warnCount} | ${res.errorCount} | ${res.pageerrorCount} | ${msg} |`
      );
    }

    return lines.join('\n');
  }
}
