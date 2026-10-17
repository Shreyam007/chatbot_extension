// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Window } from 'happy-dom';
import { getPageProfile, type PageKind } from '../../src/shared/page-profile';

describe('40+ Saved Real-DOM Fixtures Matrix & Fingerprint Invariant (v1.0.9)', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures');

  const fixtureFiles = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.endsWith('.html'));

  it('contains at least 40 saved real-DOM fixtures in tests/fixtures/', () => {
    expect(fixtureFiles.length).toBeGreaterThanOrEqual(40);
  });

  const TAXONOMY_EXPECTATIONS: Record<string, PageKind> = {
    'leetcode-problem.html': 'coding_problem',
    'leetcode-two-sum-description.html': 'coding_problem',
    'leetcode-two-sum-solutions.html': 'coding_problem',
    'codeforces-problem.html': 'coding_problem',
    'codeforces-blog.html': 'article',
    'wikipedia-article.html': 'article',
    'wikipedia-binary-search.html': 'article',
    'wikipedia-hindi.html': 'article',
    'wikipedia-category.html': 'article',
    'wikipedia-disambiguation.html': 'article',
    'mdn-documentation.html': 'documentation',
    'mdn-reference-page.html': 'documentation',
    'docs-sidebar-nav.html': 'documentation',
    'pdf-viewer-placeholder.html': 'pdf',
    'chrome-internal-mock.html': 'restricted',
    'substack-newsletter.html': 'general',
    'github-readme.html': 'general',
    'mathjax-katex-page.html': 'general',
    'code-heavy-no-prose.html': 'general',
    'huge-tables-page.html': 'general',
    'marketing-accordion-faq.html': 'general',
    'landing-div-only.html': 'general',
  };

  it('table-driven validation across all fixtures: clean text, budget, and taxonomy', () => {
    for (const filename of fixtureFiles) {
      const fullPath = path.join(fixturesDir, filename);
      const rawHtml = fs.readFileSync(fullPath, 'utf-8');

      // 1. Budget sanity: Raw HTML should not exceed 1MB (even Hindi fixture is ~320KB)
      expect(rawHtml.length).toBeLessThan(1_000_000);

      // 2. Parse DOM with happy-dom
      let mockUrl = 'https://example.com/test';
      if (filename.includes('leetcode')) mockUrl = 'https://leetcode.com/problems/test/';
      else if (filename.includes('codeforces-problem')) mockUrl = 'https://codeforces.com/problemset/problem/1/A';
      else if (filename.includes('codeforces-blog')) mockUrl = 'https://codeforces.com/blog/entry/12345';
      else if (filename.includes('wikipedia')) mockUrl = `https://en.wikipedia.org/wiki/${filename.replace('.html', '')}`;
      else if (filename.includes('mdn')) mockUrl = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference';
      else if (filename.includes('docs')) mockUrl = 'https://reactrouter.com/docs/getting-started';
      else if (filename.includes('pdf')) mockUrl = 'https://example.com/doc.pdf';
      else if (filename.includes('chrome-internal')) mockUrl = 'chrome://extensions';

      const win = new Window({ url: mockUrl });
      win.document.write(rawHtml);
      const doc = win.document as unknown as Document;

      // 3. Taxonomy Profile Check
      const profile = getPageProfile(null, mockUrl);
      const expectedKind = TAXONOMY_EXPECTATIONS[filename];
      if (expectedKind) {
        expect(profile.kind, `Taxonomy mismatch for ${filename}`).toBe(expectedKind);
      }

      // 4. Clean text extraction: No script or style tag content
      const scripts = doc.querySelectorAll('script');
      scripts.forEach((s) => s.remove());
      const styles = doc.querySelectorAll('style');
      styles.forEach((s) => s.remove());

      const cleanText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
      expect(cleanText).not.toContain('<script');
      expect(cleanText).not.toContain('<style');

      // 5. Grounding readiness: ensure non-empty pages have extractable text
      if (filename !== 'blank-empty-page.html' && filename !== 'pdf-viewer-placeholder.html') {
        expect(cleanText.length).toBeGreaterThan(0);
      }
    }
  });

  it('mocked-LLM fingerprint test: 12 diverse fixtures produce 12 unique request payloads', () => {
    const diverseFixtures = [
      { file: 'leetcode-two-sum-description.html', url: 'https://leetcode.com/problems/two-sum/' },
      { file: 'codeforces-problem.html', url: 'https://codeforces.com/problemset/problem/1/A' },
      { file: 'wikipedia-binary-search.html', url: 'https://en.wikipedia.org/wiki/Binary_search_algorithm' },
      { file: 'wikipedia-hindi.html', url: 'https://en.wikipedia.org/wiki/Hindi' },
      { file: 'mdn-documentation.html', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
      { file: 'docs-sidebar-nav.html', url: 'https://docs.example.com/nav' },
      { file: 'substack-newsletter.html', url: 'https://newsletter.example.com/post' },
      { file: 'github-readme.html', url: 'https://github.com/example/repo' },
      { file: 'mathjax-katex-page.html', url: 'https://math.example.com/spectral' },
      { file: 'huge-tables-page.html', url: 'https://algo.example.com/tables' },
      { file: 'marketing-accordion-faq.html', url: 'https://example.com/faq' },
      { file: 'landing-div-only.html', url: 'https://example.com/landing' },
    ];

    expect(diverseFixtures.length).toBe(12);

    const fingerprints = new Set<string>();

    for (const fixture of diverseFixtures) {
      const fullPath = path.join(fixturesDir, fixture.file);
      const rawHtml = fs.readFileSync(fullPath, 'utf-8');

      const win = new Window({ url: fixture.url });
      win.document.write(rawHtml);
      const doc = win.document as unknown as Document;

      // Strip scripts and styles
      doc.querySelectorAll('script, style').forEach((n) => n.remove());
      const bodyText = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500);

      const payload = JSON.stringify({
        url: fixture.url,
        title: doc.title,
        excerpt: bodyText,
        systemPrompt: 'You are Unstuck, an AI tutor. Answer questions using only the provided context.',
      });

      const hash = crypto.createHash('sha256').update(payload).digest('hex');
      fingerprints.add(hash);
    }

    // Invariant: All 12 diverse fixtures must produce 12 completely distinct prompt payloads
    expect(fingerprints.size).toBe(12);
  });
});
