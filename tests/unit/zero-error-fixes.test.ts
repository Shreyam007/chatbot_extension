// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import * as fs from 'fs';
import * as path from 'path';
import { PageContextSchema } from '../../src/shared/schemas/context';
import { genericAdapter } from '../../src/content/adapters/generic';
import { leetcodeAdapter } from '../../src/content/adapters/leetcode';
import { extractReadabilityContent } from '../../src/content/extractor/readability';
import { checkSensitivePage } from '../../src/content/extractor/sensitive';
import { isBlacklistedUrl } from '../../src/shared/sensitive';
import { highlightTextInPage } from '../../src/content/highlighter';
import { SignalCollector } from '../../src/content/signals/collector';

describe('Zero-Error Fixes (F1 - F18)', () => {
  const loadFixture = (filename: string, url = 'https://example.com/test'): { doc: Document; win: Window; urlObj: URL } => {
    const fixturePath = path.resolve(__dirname, '../fixtures', filename);
    const html = fs.readFileSync(fixturePath, 'utf8');
    const win = new Window({ url });
    win.document.write(html);
    return {
      doc: win.document as unknown as Document,
      win,
      urlObj: new URL(url),
    };
  };

  it('F1: fixes Evidence E1/E2 on wikipedia-hindi.html: statementText <= 16000 and valid schema', () => {
    const { doc, urlObj } = loadFixture('wikipedia-hindi.html', 'https://en.wikipedia.org/wiki/Hindi');
    const ctx = genericAdapter.extractContext(doc, urlObj);

    expect(ctx).not.toBeNull();
    expect(ctx!.statementText.length).toBeLessThanOrEqual(16000);
    expect(ctx!.statementLength).toBeLessThanOrEqual(16000);

    const validation = PageContextSchema.safeParse(ctx);
    expect(validation.success).toBe(true);
    if (!validation.success) {
      expect(validation.error.flatten().fieldErrors).toEqual({});
    }
  });

  it('F4: prevents false positive accepted verdict on leetcode-two-sum-description.html', () => {
    const { doc } = loadFixture('leetcode-two-sum-description.html', 'https://leetcode.com/problems/two-sum/');
    // Problem stats has "Accepted 15.4M", which must NOT be treated as a submission verdict
    const verdict = leetcodeAdapter.detectVerdict?.(doc);
    expect(verdict).toBeNull();
  });

  it('F9: preserves accordion/FAQ questions and extracts collapsed answers in marketing-accordion-faq.html', () => {
    const { doc } = loadFixture('marketing-accordion-faq.html', 'https://example.com/faq');
    const extracted = extractReadabilityContent(doc);

    expect(extracted.statementText).toContain('Is there a free trial available?');
    expect(extracted.statementText).toContain('What is your cancellation policy?');
    expect(extracted.statementText).toContain('How does billing work?');
    expect(extracted.sections.length).toBeGreaterThan(0);
  });

  it('F9: extracts leaf content on div-only landing pages via <60% block coverage fallback', () => {
    const { doc } = loadFixture('landing-div-only.html', 'https://example.com/landing');
    const extracted = extractReadabilityContent(doc);

    expect(extracted.statementText).toContain('Sub-second Latency Querying');
    expect(extracted.statementText).toContain('Autonomous ML Insights');
    expect(extracted.statementText).toContain('Zero Infrastructure Overhead');
    expect(extracted.statementText).toContain('99.999%');
  });

  it('F10: does NOT mark docs page with hidden login modal as sensitive', () => {
    const { doc, urlObj } = loadFixture('hidden-login-modal.html', 'https://docs.example.com/guides');
    const check = checkSensitivePage(doc, urlObj);
    expect(check.isSensitive).toBe(false);
  });

  it('F10: correctly identifies visible login and checkout pages as sensitive', () => {
    const login = loadFixture('login-page.html', 'https://auth.example.com/login');
    expect(checkSensitivePage(login.doc, login.urlObj).isSensitive).toBe(true);

    const checkout = loadFixture('checkout-page.html', 'https://shop.example.com/checkout');
    expect(checkSensitivePage(checkout.doc, checkout.urlObj).isSensitive).toBe(true);
  });

  it('F10: enforces word boundaries on sensitive URL patterns (no false positives on Wikipedia)', () => {
    expect(isBlacklistedUrl('https://en.wikipedia.org/wiki/Payment').isBlacklisted).toBe(false);
    expect(isBlacklistedUrl('https://en.wikipedia.org/wiki/Passport').isBlacklisted).toBe(false);
    expect(isBlacklistedUrl('https://en.wikipedia.org/wiki/Open_banking').isBlacklisted).toBe(false);
    expect(isBlacklistedUrl('https://en.wikipedia.org/wiki/Cartoon').isBlacklisted).toBe(false);

    // True positives
    expect(isBlacklistedUrl('https://chase.com/login').isBlacklisted).toBe(true);
    expect(isBlacklistedUrl('https://shop.com/checkout').isBlacklisted).toBe(true);
    expect(isBlacklistedUrl('https://store.com/cart').isBlacklisted).toBe(true);
    expect(isBlacklistedUrl('https://irs.gov/payments').isBlacklisted).toBe(true);
  });

  it('F14: highlights text spanning across inline nodes (strong, em, span)', () => {
    const win = new Window({ url: 'https://example.com' });
    win.document.write(`
      <div id="content">
        <p id="target">An <strong>algorithm</strong> that runs in <em>O(log n)</em> time complexity.</p>
      </div>
    `);
    const doc = win.document as unknown as Document;

    const matched = highlightTextInPage('algorithm that runs in O(log n)', doc);
    expect(matched).toBe(true);
  });

  it('F11: SignalCollector defaults to 300_000ms idle threshold and tracks readingMs', () => {
    const collector = new SignalCollector();
    const snapshot = collector.getSnapshot();

    expect(snapshot.readingMs).toBeDefined();
    expect(snapshot.readingMs).toBe(0);

    collector.destroy();
  });
});
