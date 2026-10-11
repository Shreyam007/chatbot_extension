import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../../.output/chrome-mv3');
const artifactsDir = 'C:/Users/Shreyam/.gemini/antigravity-ide/brain/c76e3726-b8c9-4ac5-9598-a4711eddb3e4';

test('Step 15: Options Page Local Metrics Dashboard and CSV export', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Wait for background service worker
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();

  const page = await context.newPage();
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(`chrome-extension://${extensionId}/options.html#privacy`, { waitUntil: 'load' });

  // 1. Verify Navigation to Privacy & Storage Tab
  await page.locator('[data-testid="tab-privacy-data"]').click();

  // 2. Verify Local Metrics & Evaluation Bento Card
  const metricsGrid = page.locator('[data-testid="metrics-summary-grid"]');
  await expect(metricsGrid).toBeVisible();

  // 3. Verify KPI Tiles inside the grid
  await expect(metricsGrid.getByText('Nudge Acceptance')).toBeVisible();
  await expect(metricsGrid.getByText('Nudge Dismissal')).toBeVisible();
  await expect(metricsGrid.getByText('Solved Problems')).toBeVisible();
  await expect(metricsGrid.getByText('Hints per Solve')).toBeVisible();
  await expect(metricsGrid.getByText('Hint Helpfulness')).toBeVisible();
  await expect(metricsGrid.getByText('Latency p50 / p95')).toBeVisible();
  await expect(metricsGrid.getByText('Critic Rejection', { exact: true })).toBeVisible();
  await expect(metricsGrid.getByText('Fallback Rate', { exact: true })).toBeVisible();

  // 4. Capture screenshot of the metrics view
  try {
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    await page.screenshot({ path: path.join(artifactsDir, 'options_metrics_view.png') });
  } catch (err) {
    console.warn('Screenshot capture warning:', err);
  }

  // 5. Test Export Metrics (CSV) button triggers download
  const downloadPromise = page.waitForEvent('download', { timeout: 8000 });
  await page.locator('[data-testid="export-metrics-csv"]').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^unstuck-metrics-.*\.csv$/);

  // Read downloaded file content
  const downloadPath = await download.path();
  if (downloadPath) {
    const csvContent = fs.readFileSync(downloadPath, 'utf8');
    expect(csvContent).toContain('Metric Category,Metric Name,Value,Unit / Description');
    expect(csvContent).toContain('Nudge Acceptance Rate');
    expect(csvContent).toContain('Critic Rejection Rate');
  }

  // 6. Test Export Metrics (Markdown) button triggers download
  const mdDownloadPromise = page.waitForEvent('download', { timeout: 8000 });
  await page.locator('[data-testid="export-metrics-md"]').click();
  const mdDownload = await mdDownloadPromise;

  expect(mdDownload.suggestedFilename()).toMatch(/^unstuck-metrics-.*\.md$/);
  const mdDownloadPath = await mdDownload.path();
  if (mdDownloadPath) {
    const mdContent = fs.readFileSync(mdDownloadPath, 'utf8');
    expect(mdContent).toContain('# Unstuck Local Metrics Summary');
    expect(mdContent).toContain('| Category | Metric Name | Value | Unit / Description |');
  }

  await context.close();
});
