import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getPageProfile, type PageKind } from '../../src/shared/page-profile';

describe('Overfitting Sentinel & Generic Chips Specification (v1.0.9)', () => {
  const FORBIDDEN_WORDS = [
    'fellowship',
    'eligibility',
  ];

  // Specific check for UI and prompts (excluding benchmark datasets and test files)
  const SOURCE_DIRS_TO_SCAN = [
    path.resolve(__dirname, '../../src/sidepanel'),
    path.resolve(__dirname, '../../src/content'),
    path.resolve(__dirname, '../../src/popup'),
    path.resolve(__dirname, '../../src/shared/retrieval'),
  ];

  function getFilesRecursively(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getFilesRecursively(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('scans UI components, content scripts, and retrieval logic for forbidden overfitted words', () => {
    const allFiles = SOURCE_DIRS_TO_SCAN.flatMap(getFilesRecursively);
    expect(allFiles.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; word: string; line: number }> = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        // Skip comment lines
        const trimmed = lineText.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          return;
        }

        for (const word of FORBIDDEN_WORDS) {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          if (regex.test(lineText)) {
            violations.push({ file: path.basename(file), word, line: idx + 1 });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('scans production build bundle if present for forbidden overfitted words', () => {
    const bundleDir = path.resolve(__dirname, '../../.output/chrome-mv3');
    if (!fs.existsSync(bundleDir)) {
      return; // Skip if build hasn't run yet
    }

    const bundleFiles = getFilesRecursively(bundleDir);
    const violations: Array<{ file: string; word: string }> = [];

    for (const file of bundleFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const word of FORBIDDEN_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(content)) {
          violations.push({ file: path.basename(file), word });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('renders generic suggestion chips for 12 different fixtures and asserts they are identical per kind', () => {
    const fixtures: Array<{
      id: string;
      url: string;
      kind: PageKind;
      contentType?: 'problem' | 'article' | 'documentation';
      site?: string;
    }> = [
      // 1. LeetCode Two Sum
      { id: '1', url: 'https://leetcode.com/problems/two-sum/', kind: 'coding_problem', site: 'leetcode', contentType: 'problem' },
      // 2. Codeforces Watermelon
      { id: '2', url: 'https://codeforces.com/problemset/problem/4/A', kind: 'coding_problem', site: 'codeforces', contentType: 'problem' },
      // 3. LeetCode Submissions
      { id: '3', url: 'https://leetcode.com/problems/valid-parentheses/', kind: 'coding_problem', site: 'leetcode', contentType: 'problem' },
      // 4. MDN Array Map
      { id: '4', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map', kind: 'documentation', contentType: 'documentation' },
      // 5. MDN Fetch API
      { id: '5', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API', kind: 'documentation', contentType: 'documentation' },
      // 6. Wikipedia India
      { id: '6', url: 'https://en.wikipedia.org/wiki/India', kind: 'article', contentType: 'article' },
      // 7. Wikipedia Binary Search
      { id: '7', url: 'https://en.wikipedia.org/wiki/Binary_search_algorithm', kind: 'article', contentType: 'article' },
      // 8. Wikipedia Hindi
      { id: '8', url: 'https://hi.wikipedia.org/wiki/कम्प्यूटर', kind: 'article', contentType: 'article' },
      // 9. Generic News Article
      { id: '9', url: 'https://technews.example.com/article/ai-breakthrough', kind: 'article', contentType: 'article' },
      // 10. General Marketing / Blog
      { id: '10', url: 'https://engineering.blog.com/building-scale', kind: 'article', contentType: 'article' },
      // 11. PDF Viewer
      { id: '11', url: 'https://arxiv.org/pdf/1706.03762.pdf', kind: 'pdf' },
      // 12. Restricted System Page
      { id: '12', url: 'chrome://extensions', kind: 'restricted' },
    ];

    const expectedChipsByKind: Record<PageKind, string[]> = {
      coding_problem: ['Explain this problem', 'Give me a direction', 'Check my approach'],
      documentation: ['Summarize this page', 'Explain this section', 'What are the key points?'],
      article: ['Summarize this page', 'Key facts', 'Explain in simple words'],
      general: ['Summarize this page', 'Key facts', 'Explain in simple words'],
      pdf: ['Paste text to ask about', 'Ask general question'],
      restricted: ['Ask general question'],
      none: ['Ask general question'],
    };

    for (const fixture of fixtures) {
      const profile = getPageProfile({
        url: fixture.url,
        site: fixture.site || 'generic',
        contentType: fixture.contentType,
        statementText: 'Fixture body text...',
        title: `Fixture ${fixture.id}`,
      } as any);

      expect(profile.kind).toBe(fixture.kind);
      expect(profile.chips).toEqual(expectedChipsByKind[fixture.kind]);
    }
  });
});
