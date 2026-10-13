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

    it('extracts valid PageContext from /problems/two-sum/description/ variant', () => {
      const url = new URL('https://leetcode.com/problems/two-sum/description/');
      const context = leetcodeAdapter.extractContext(doc, url);

      expect(context).not.toBeNull();
      expect(context?.title).toBe('1. Two Sum');
      expect(context?.url).toBe('leetcode:two-sum');
      expect(context?.statementText).toContain('Given an array of integers');
      expect(PageContextSchema.safeParse(context).success).toBe(true);
    });

    it('extracts valid PageContext from /solutions and /submissions tabs (unmounted description panel)', () => {
      // 1. Visit /problems/two-sum/ so statement is cached
      const descUrl = new URL('https://leetcode.com/problems/two-sum/');
      leetcodeAdapter.extractContext(doc, descUrl);

      // 2. Navigate to /solutions where description DOM is unmounted and title is 'Solutions - Two Sum - LeetCode'
      const solWin = new Window({ url: 'https://leetcode.com/problems/two-sum/solutions/' });
      solWin.document.write('<html><head><title>Solutions - Two Sum - LeetCode</title></head><body><div id="solutions-view">Community solutions list</div></body></html>');
      const solDoc = solWin.document as unknown as Document;
      const solUrl = new URL('https://leetcode.com/problems/two-sum/solutions/');

      const solContext = leetcodeAdapter.extractContext(solDoc, solUrl);
      expect(solContext).not.toBeNull();
      expect(solContext?.title).toBe('Two Sum');
      expect(solContext?.title).not.toBe('Solutions');
      expect(solContext?.title).not.toBe('LeetCode');
      // Statement retrieved from cache
      expect(solContext?.statementText).toContain('Given an array of integers');
      expect(PageContextSchema.safeParse(solContext).success).toBe(true);

      // 3. Navigate to /submissions tab
      const subWin = new Window({ url: 'https://leetcode.com/problems/two-sum/submissions/' });
      subWin.document.write('<html><head><title>Submissions - Two Sum - LeetCode</title></head><body><div id="submissions-view">Your submissions</div></body></html>');
      const subDoc = subWin.document as unknown as Document;
      const subUrl = new URL('https://leetcode.com/problems/two-sum/submissions/');

      const subContext = leetcodeAdapter.extractContext(subDoc, subUrl);
      expect(subContext).not.toBeNull();
      expect(subContext?.title).toBe('Two Sum');
      expect(subContext?.title).not.toBe('Submissions');
      expect(subContext?.statementText).toContain('Given an array of integers');
      expect(PageContextSchema.safeParse(subContext).success).toBe(true);
    });

    it('handles fresh tab load directly on /solutions without prior cache', () => {
      const freshWin = new Window({ url: 'https://leetcode.com/problems/reverse-integer/solutions/' });
      freshWin.document.write('<html><head><title>Solutions - Reverse Integer - LeetCode</title></head><body></body></html>');
      const freshDoc = freshWin.document as unknown as Document;
      const freshUrl = new URL('https://leetcode.com/problems/reverse-integer/solutions/');

      const context = leetcodeAdapter.extractContext(freshDoc, freshUrl);
      expect(context).not.toBeNull();
      expect(context?.title).toBe('Reverse Integer');
      expect(context?.statementText).toContain('Reverse Integer');
      expect(PageContextSchema.safeParse(context).success).toBe(true);
    });

    it('never extracts "LeetCode" as problem title during early React hydration', () => {
      const unhydratedWin = new Window({ url: 'https://leetcode.com/problems/3sum/' });
      unhydratedWin.document.write('<html><head><title>LeetCode - The World\'s Leading Online Programming Learning Platform</title></head><body><div id="__next"></div></body></html>');
      const unhydratedDoc = unhydratedWin.document as unknown as Document;
      const unhydratedUrl = new URL('https://leetcode.com/problems/3sum/');

      const context = leetcodeAdapter.extractContext(unhydratedDoc, unhydratedUrl);
      expect(context).not.toBeNull();
      expect(context?.title).toBe('3sum');
      expect(context?.title).not.toContain('LeetCode');
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
