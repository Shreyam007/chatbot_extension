import { describe, it, expect } from 'vitest';
import { getPageProfile, type PageKind } from '../../src/shared/page-profile';
import type { PageContext } from '../../src/shared/schemas/context';
import fs from 'fs';
import path from 'path';

describe('Page Profile Specification (Part A of v1.0.8)', () => {
  const testCases: Array<{
    name: string;
    input: Partial<PageContext> | { url: string };
    expectedKind: PageKind;
    expectedSourceName: string;
    expectedContextLabel: string;
    expectedShowLevels: boolean;
    expectedShowHintsTab: boolean;
    expectedPlaceholder: string;
  }> = [
    {
      name: 'LeetCode Problem',
      input: {
        url: 'https://leetcode.com/problems/two-sum/',
        site: 'leetcode',
        title: 'Two Sum',
        statementText: 'Given an array...',
      },
      expectedKind: 'coding_problem',
      expectedSourceName: 'LeetCode',
      expectedContextLabel: 'LeetCode - Problem',
      expectedShowLevels: true,
      expectedShowHintsTab: true,
      expectedPlaceholder: 'Ask a question about this problem...',
    },
    {
      name: 'Codeforces Problem',
      input: {
        url: 'https://codeforces.com/problemset/problem/1/A',
        site: 'codeforces',
        title: 'Theatre Square',
        statementText: 'Theatre Square in the capital city...',
      },
      expectedKind: 'coding_problem',
      expectedSourceName: 'Codeforces',
      expectedContextLabel: 'Codeforces - Problem',
      expectedShowLevels: true,
      expectedShowHintsTab: true,
      expectedPlaceholder: 'Ask a question about this problem...',
    },
    {
      name: 'Wikipedia Article (English)',
      input: {
        url: 'https://en.wikipedia.org/wiki/India',
        site: 'generic',
        contentType: 'article',
        title: 'India - Wikipedia',
        statementText: 'India, officially the Republic of India...',
      },
      expectedKind: 'article',
      expectedSourceName: 'Wikipedia',
      expectedContextLabel: 'Wikipedia - Article',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Ask a question about this page...',
    },
    {
      name: 'Wikipedia Article (Hindi Subdomain)',
      input: {
        url: 'https://hi.wikipedia.org/wiki/भारत',
        site: 'generic',
        contentType: 'article',
        title: 'भारत - विकिपीडिया',
        statementText: 'भारत गणराज्य दक्षिण एशिया में स्थित...',
      },
      expectedKind: 'article',
      expectedSourceName: 'Wikipedia',
      expectedContextLabel: 'Wikipedia - Article',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Ask a question about this page...',
    },
    {
      name: 'MDN Documentation',
      input: {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map',
        site: 'generic',
        contentType: 'documentation',
        title: 'Array.prototype.map() - JavaScript | MDN',
        statementText: 'The map() method of Array instances...',
      },
      expectedKind: 'documentation',
      expectedSourceName: 'MDN',
      expectedContextLabel: 'MDN - Documentation',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Ask a question about this page...',
    },
    {
      name: 'General Web Page',
      input: {
        url: 'https://example.com/about-us',
        site: 'generic',
        title: 'About Us',
        statementText: 'Welcome to Example Company...',
      },
      expectedKind: 'general',
      expectedSourceName: 'example.com',
      expectedContextLabel: 'example.com - Web page',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Ask a question about this page...',
    },
    {
      name: 'PDF Document URL',
      input: {
        url: 'https://example.com/research-paper.pdf',
      },
      expectedKind: 'pdf',
      expectedSourceName: 'PDF',
      expectedContextLabel: 'PDF - Not readable',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Paste text or ask a general question...',
    },
    {
      name: 'Restricted chrome:// page',
      input: {
        url: 'chrome://extensions',
      },
      expectedKind: 'restricted',
      expectedSourceName: 'System',
      expectedContextLabel: 'Restricted page',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Ask a general question (not based on this page)...',
    },
    {
      name: 'No Tab / Empty State',
      input: {
        url: '',
      },
      expectedKind: 'none',
      expectedSourceName: 'No Page',
      expectedContextLabel: 'No readable page',
      expectedShowLevels: false,
      expectedShowHintsTab: false,
      expectedPlaceholder: 'Ask a general question or paste text...',
    },
  ];

  for (const tc of testCases) {
    it(`evaluates profile correctly for: ${tc.name}`, () => {
      const profile = getPageProfile(tc.input as any);
      expect(profile.kind).toBe(tc.expectedKind);
      expect(profile.sourceName).toBe(tc.expectedSourceName);
      expect(profile.contextLabel).toBe(tc.expectedContextLabel);
      expect(profile.showLevels).toBe(tc.expectedShowLevels);
      expect(profile.showHintsTab).toBe(tc.expectedShowHintsTab);
      expect(profile.placeholder).toBe(tc.expectedPlaceholder);

      // Verify invariant: Levels and Hints Tab are strictly restricted to coding_problem
      if (profile.kind !== 'coding_problem') {
        expect(profile.showLevels).toBe(false);
        expect(profile.showHintsTab).toBe(false);
        expect(profile.emptyStateBody).not.toContain('Current solution code and constraints are already indexed');
      } else {
        expect(profile.showLevels).toBe(true);
        expect(profile.showHintsTab).toBe(true);
      }
    });
  }

  it('verifies chips are tailored per kind', () => {
    const probProfile = getPageProfile({
      url: 'https://leetcode.com/problems/two-sum/',
      site: 'leetcode',
      title: 'Two Sum',
      statementText: 'text',
    } as any);
    expect(probProfile.chips).toEqual([
      'Explain this problem',
      'Give me a direction',
      'Check my approach',
    ]);

    const articleProfile = getPageProfile({
      url: 'https://en.wikipedia.org/wiki/India',
      site: 'generic',
      contentType: 'article',
      title: 'India',
      statementText: 'text',
    } as any);
    expect(articleProfile.chips).toEqual([
      'Summarize this page',
      'Key facts',
      'Explain in simple words',
    ]);

    const docProfile = getPageProfile({
      url: 'https://developer.mozilla.org/en-US/docs/Web/API',
      site: 'generic',
      contentType: 'documentation',
      title: 'Web APIs',
      statementText: 'text',
    } as any);
    expect(docProfile.chips).toEqual([
      'Summarize this page',
      'Explain this section',
      'What are the key points?',
    ]);
  });
});
