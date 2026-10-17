import type { Page, Worker, BrowserContext } from '@playwright/test';
import type { CapturedError, ErrorLevel } from './types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ErrorCollector {
  public errors: CapturedError[] = [];
  private allowlist: Array<{ pattern: string; justification: string }> = [];

  constructor() {
    this.loadAllowlist();
  }

  public loadAllowlist() {
    try {
      const allowlistPath = path.resolve(__dirname, 'allowlist.json');
      if (fs.existsSync(allowlistPath)) {
        this.allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
      }
    } catch {
      this.allowlist = [];
    }
  }

  public isAllowlisted(text: string): boolean {
    return this.allowlist.some((entry) => {
      try {
        const regex = new RegExp(entry.pattern, 'i');
        return regex.test(text);
      } catch {
        return text.includes(entry.pattern);
      }
    });
  }

  public record(level: ErrorLevel, text: string, source: CapturedError['source'], url: string) {
    // Only capture Unstuck-related entries or extension files or pageerrors from our extensions
    const isUnstuck = text.includes('[Unstuck]') || text.includes('unstuck') || url.includes('chrome-extension://');
    const isExtensionSource = source === 'content' || source === 'sw' || source === 'sidepanel' || source === 'popup' || source === 'options';

    if ((isUnstuck || isExtensionSource) && !this.isAllowlisted(text)) {
      this.errors.push({
        level,
        text,
        source,
        url,
        timestamp: Date.now(),
      });
    }
  }

  public attachToPage(page: Page, source: CapturedError['source'] = 'content') {
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'warning' || type === 'error') {
        const text = msg.text();
        const level: ErrorLevel = type === 'warning' ? 'warn' : 'error';
        this.record(level, text, source, page.url());
      }
    });

    page.on('pageerror', (err) => {
      this.record('pageerror', err.message || String(err), source, page.url());
    });
  }

  public async attachToWorker(context: BrowserContext, worker: Worker) {
    try {
      // 1. In-worker console wrapper
      await worker.evaluate(() => {
        const g = globalThis as any;
        if (g.__unstuckErrorCollectorInstalled) return;
        g.__unstuckErrorCollectorInstalled = true;
        g.__unstuckWorkerLogs = g.__unstuckWorkerLogs || [];

        const origWarn = console.warn;
        console.warn = (...args: any[]) => {
          g.__unstuckWorkerLogs.push({ level: 'warn', text: args.map(String).join(' ') });
          origWarn.apply(console, args);
        };

        const origError = console.error;
        console.error = (...args: any[]) => {
          g.__unstuckWorkerLogs.push({ level: 'error', text: args.map(String).join(' ') });
          origError.apply(console, args);
        };
      });

      // 2. CDP Session for real-time service worker events
      try {
        const cdp = await (context as any).newCDPSession(worker);
        await cdp.send('Runtime.enable');
        cdp.on('Runtime.consoleAPICalled', (params: any) => {
          if (params.type === 'warning' || params.type === 'error') {
            const text = (params.args || []).map((a: any) => a.value || a.description || '').join(' ');
            const level: ErrorLevel = params.type === 'warning' ? 'warn' : 'error';
            this.record(level, text, 'sw', worker.url());
          }
        });
        cdp.on('Runtime.exceptionThrown', (params: any) => {
          const text = params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || 'Worker exception';
          this.record('error', text, 'sw', worker.url());
        });
      } catch {
        // Fallback to polling worker log buffer
      }
    } catch {
      // Best effort
    }
  }

  public async drainWorkerLogs(worker: Worker) {
    try {
      const logs = await worker.evaluate(() => {
        const g = globalThis as any;
        const retrieved = g.__unstuckWorkerLogs || [];
        g.__unstuckWorkerLogs = [];
        return retrieved;
      });
      for (const log of logs) {
        this.record(log.level as ErrorLevel, log.text, 'sw', worker.url());
      }
    } catch {
      // Worker may be inactive
    }
  }

  public clear() {
    this.errors = [];
  }
}
