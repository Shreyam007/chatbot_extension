import { describe, it, expect } from 'vitest';
import { truncateToBudget, sanitizeSectionsBudget, type SectionBudget } from '../../src/shared/budget';
import { LIMITS } from '../../src/shared/config';

describe('Budget Truncation (F1 & Evidence E1/E2)', () => {
  it('strictly guarantees returned.length <= max across 1,500 random inputs', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \n\t!@#$%^&*()_+-=[]{}|;:,.<>?/🚀✨🔥हिंदीবাংলা';

    for (let i = 0; i < 1500; i++) {
      // Random length between 0 and 50,000
      const len = Math.floor(Math.random() * 50000);
      let str = '';
      for (let c = 0; c < Math.min(len, 2000); c++) {
        str += chars[Math.floor(Math.random() * chars.length)];
      }
      // Expand string if len > 2000
      while (str.length < len) {
        str += str.slice(0, Math.min(str.length, len - str.length));
      }

      // Random budget between 1 and 20,000
      const maxBudget = Math.floor(Math.random() * 20000) + 1;
      const marker = Math.random() > 0.5 ? '... [truncated]' : '\n\n[...Text truncated for token budget...]';

      const result = truncateToBudget(str, maxBudget, marker);

      // Invariant 1: Result MUST NOT exceed budget
      expect(result.length).toBeLessThanOrEqual(maxBudget);

      // Invariant 2: If input was within budget, result must equal input untouched
      if (str.length <= maxBudget) {
        expect(result).toBe(str);
      } else if (maxBudget >= marker.length) {
        // Invariant 3: If truncated, result must end with marker
        expect(result.endsWith(marker)).toBe(true);
      }
    }
  });

  it('handles edge cases (zero max, negative max, empty text, short max)', () => {
    expect(truncateToBudget('', 100)).toBe('');
    expect(truncateToBudget('hello', 0)).toBe('');
    expect(truncateToBudget('hello', -5)).toBe('');
    expect(truncateToBudget('hello world', 5, '...')).toBe('he...');
    expect(truncateToBudget('hello world', 2, '... [truncated]')).toBe('..');
  });

  it('fixes Evidence E1/E2 exactly: MAX_STATEMENT_CHARS with marker is strictly <= 16000', () => {
    const hugeText = 'A'.repeat(25000);
    const marker = '\n\n[...Text truncated for token budget...]';
    const result = truncateToBudget(hugeText, LIMITS.MAX_STATEMENT_CHARS, marker);

    expect(result.length).toBe(16000);
    expect(result.length).toBeLessThanOrEqual(LIMITS.MAX_STATEMENT_CHARS);
    expect(result.endsWith(marker)).toBe(true);
  });

  it('sanitizes sections budget according to limits', () => {
    const sections: SectionBudget[] = [];
    for (let i = 0; i < 80; i++) {
      sections.push({
        id: `sec-${i}`,
        title: `Section ${i}`,
        text: 'X'.repeat(5000), // Exceeds individual cap
      });
    }

    const sanitized = sanitizeSectionsBudget(sections, 60, 4000, 60000);

    // Invariant 1: Count capped to maxCount
    expect(sanitized.length).toBeLessThanOrEqual(60);

    // Invariant 2: Each section capped to maxPerSection
    for (const s of sanitized) {
      expect(s.text.length).toBeLessThanOrEqual(4000);
    }

    // Invariant 3: Total character sum capped to maxTotalChars
    const totalChars = sanitized.reduce((acc, s) => acc + s.text.length, 0);
    expect(totalChars).toBeLessThanOrEqual(60000);
  });
});
