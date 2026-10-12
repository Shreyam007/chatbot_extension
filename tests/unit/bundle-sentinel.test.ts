import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Bundle Sentinel Scanner', () => {
  const srcDir = path.resolve(__dirname, '../../src');
  const forbiddenPatterns = [
    {
      pattern: /Consider how the data structures allow O\(1\) lookups/i,
      name: 'canned Two Sum assistant chat response',
    },
    {
      pattern: /nums\[i\]\s*\+\s*nums\[j\]\s*==\s*target/i,
      name: 'ungrounded Two Sum quote in production code',
    },
    {
      pattern: /FAKE_TEST_KEY/i,
      name: 'mock key sentinel in production code',
    },
    {
      pattern: /1,842\s*\/\s*4,000\s*tokens/i,
      name: 'hardcoded 1,842 token budget display',
    },
    {
      pattern: /\[3,\s*2,\s*4,\s*1,\s*2,\s*3,\s*1,\s*2,\s*1,\s*0\]/,
      name: 'hardcoded sparkline array in production code',
    },
    {
      pattern: /under median/i,
      name: 'hardcoded Under median label in production code',
    },
  ];

  function getAllSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllSourceFiles(fullPath));
      } else if (/\.(ts|tsx|js|jsx|html|css)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it('scans all src/ files to ensure no fabricated sentinels or canned strings exist', () => {
    const files = getAllSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);

    const violations: { file: string; match: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const { pattern, name } of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push({
            file: path.relative(srcDir, file),
            match: name,
          });
        }
      }
    }

    expect(
      violations,
      `Found forbidden fabricated strings in src/ files: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it('verifies that .output/chrome-mv3 bundle (if built) does not contain canned response', () => {
    const distDir = path.resolve(__dirname, '../../.output/chrome-mv3');
    if (!fs.existsSync(distDir)) {
      // If not yet built, skip output check
      return;
    }
    const distFiles = getAllSourceFiles(distDir);
    const distViolations: string[] = [];
    for (const file of distFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/Consider how the data structures allow O\(1\) lookups/i.test(content)) {
        distViolations.push(path.relative(distDir, file));
      }
    }
    expect(distViolations).toEqual([]);
  });
});
