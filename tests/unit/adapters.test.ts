// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Window } from 'happy-dom';
import { resolveAdapter } from '../../src/content/adapters';
import { leetcodeAdapter } from '../../src/content/adapters/leetcode';
import { codeforcesAdapter } from '../../src/content/adapters/codeforces';
import { genericAdapter } from '../../src/content/adapters/generic';
import { PageContextSchema } from '../../src/shared/schemas/context';

describe('Page Adapters (Step 5)', () => {
  describe('LeetCode Adapter', () => {
    let doc: Document;

    beforeEach(() => {
      const html = readFileSync(join(__dirname, '../fixtures/leetcode-problem.html'), 'utf-8');
      const win = new Window({ url: 'https://leetcode.com/problems/two-sum/' });
      win.document.write(html);
      doc = win.document as unknown as Document;
    });

    it('matches leetcode URLs correctly', () => {
      expect(leetcodeAdapter.matches(new URL('https://leetcode.com/problems/two-sum/'))).toBe(true);
      expect(leetcodeAdapter.matches(new URL('https://leetcode.cn/problems/two-sum/'))).toBe(true);
      expect(leetcodeAdapter.matches(new URL('https://codeforces.com/problemset'))).toBe(false);
    });

    it('extracts valid PageContext from LeetCode problem page', () => {
      const url = new URL('https://leetcode.com/problems/two-sum/');
      const context = leetcodeAdapter.extractContext(doc, url);

      expect(context).not.toBeNull();
      expect(context?.title).toBe('1. Two Sum');
      expect(context?.difficulty).toBe('Easy');
      expect(context?.site).toBe('leetcode');
      expect(context?.tags).toContain('Array');
      expect(context?.tags).toContain('Hash Table');
      expect(context?.statementText).toContain('Given an array of integers');
      expect(context?.isContest).toBe(false);
      expect(context?.url).toBe('leetcode:two-sum');

      // Validates against PageContextSchema
      expect(PageContextSchema.safeParse(context).success).toBe(true);
    });

    it('detects contest mode on contest URLs and pages (EC-100)', () => {
      const contestHtml = readFileSync(join(__dirname, '../fixtures/leetcode-contest.html'), 'utf-8');
      const win = new Window({
        url: 'https://leetcode.com/contest/weekly-contest-350/problems/find-the-maximum-achievable-number/',
      });
      win.document.write(contestHtml);

      const contestUrl = new URL(
        'https://leetcode.com/contest/weekly-contest-350/problems/find-the-maximum-achievable-number/'
      );
      expect(leetcodeAdapter.detectContest(contestUrl, win.document as unknown as Document)).toBe(true);

      const context = leetcodeAdapter.extractContext(win.document as unknown as Document, contestUrl);
      expect(context?.isContest).toBe(true);
    });

    it('detects submission verdicts', () => {
      const verdict = leetcodeAdapter.detectVerdict?.(doc);
      expect(verdict).toEqual({
        verdict: 'wrong',
        rawText: 'Wrong Answer',
      });
    });

    it('reads editor code from Monaco view lines', () => {
      const code = leetcodeAdapter.readEditorCode?.(doc);
      expect(code).toContain('def twoSum(nums, target):');
      expect(code).toContain('hashmap = {}');
    });

    it('returns null safely on empty or broken DOM without throwing (EC-021)', () => {
      const win = new Window({ url: 'https://leetcode.com/explore/' });
      win.document.write('<html><body><div>Nothing here</div></body></html>');
      const context = leetcodeAdapter.extractContext(win.document as unknown as Document, new URL('https://leetcode.com/explore/'));
      expect(context).toBeNull();
    });
  });

  describe('Codeforces Adapter', () => {
    let doc: Document;

    beforeEach(() => {
      const html = readFileSync(join(__dirname, '../fixtures/codeforces-problem.html'), 'utf-8');
      const win = new Window({ url: 'https://codeforces.com/problemset/problem/4/A' });
      win.document.write(html);
      doc = win.document as unknown as Document;
    });

    it('matches codeforces URLs correctly', () => {
      expect(codeforcesAdapter.matches(new URL('https://codeforces.com/problemset/problem/4/A'))).toBe(true);
      expect(codeforcesAdapter.matches(new URL('https://codeforces.net/contest/1850'))).toBe(true);
      expect(codeforcesAdapter.matches(new URL('https://leetcode.com/problems/two-sum/'))).toBe(false);
    });

    it('extracts valid PageContext from Codeforces problem page', () => {
      const url = new URL('https://codeforces.com/problemset/problem/4/A');
      const context = codeforcesAdapter.extractContext(doc, url);

      expect(context).not.toBeNull();
      expect(context?.title).toBe('A. Watermelon');
      expect(context?.site).toBe('codeforces');
      expect(context?.tags).toContain('brute force');
      expect(context?.tags).toContain('math');
      expect(context?.statementText).toContain('Pete and his friend Billy');
      expect(context?.isContest).toBe(false);
      expect(context?.url).toBe('codeforces:4-a');

      expect(PageContextSchema.safeParse(context).success).toBe(true);
    });

    it('detects contest mode from timer banners (EC-100)', () => {
      const contestHtml = readFileSync(join(__dirname, '../fixtures/codeforces-contest.html'), 'utf-8');
      const win = new Window({
        url: 'https://codeforces.com/contest/1850/problem/B',
      });
      win.document.write(contestHtml);

      const isContest = codeforcesAdapter.detectContest(
        new URL('https://codeforces.com/contest/1850/problem/B'),
        win.document as unknown as Document
      );
      expect(isContest).toBe(true);
    });

    it('detects submission verdicts', () => {
      const verdict = codeforcesAdapter.detectVerdict?.(doc);
      expect(verdict?.verdict).toBe('wrong');
      expect(verdict?.rawText).toContain('Wrong answer on test 1');
    });

    it('reads editor code from textarea', () => {
      const code = codeforcesAdapter.readEditorCode?.(doc);
      expect(code).toContain('#include <iostream>');
    });
  });

  describe('Generic Adapter (Fallback)', () => {
    let doc: Document;

    beforeEach(() => {
      const html = readFileSync(join(__dirname, '../fixtures/generic-article.html'), 'utf-8');
      const win = new Window({ url: 'https://algorithms.org/bfs-guide' });
      win.document.write(html);
      doc = win.document as unknown as Document;
    });

    it('matches any URL as fallback', () => {
      expect(genericAdapter.matches(new URL('https://random-site.com/doc'))).toBe(true);
    });

    it('extracts main article content and title (EC-020)', () => {
      const url = new URL('https://algorithms.org/bfs-guide');
      const context = genericAdapter.extractContext(doc, url);

      expect(context).not.toBeNull();
      expect(context?.title).toContain('Breadth First Search');
      expect(context?.site).toBe('generic');
      expect(context?.statementText.toLowerCase()).toContain('breadth-first search is an algorithm');
      expect(context?.isContest).toBe(false);

      expect(PageContextSchema.safeParse(context).success).toBe(true);
    });

    it('adapter resolver routes URLs to the right adapter', () => {
      expect(resolveAdapter(new URL('https://leetcode.com/problems/foo'))).toBe(leetcodeAdapter);
      expect(resolveAdapter(new URL('https://codeforces.com/problem/123'))).toBe(codeforcesAdapter);
      expect(resolveAdapter(new URL('https://unknown-domain.io/algo'))).toBe(genericAdapter);
    });
  });
});
