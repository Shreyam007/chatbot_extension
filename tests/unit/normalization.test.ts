import { describe, it, expect } from 'vitest';
import { normaliseForMatch, tokenizeForMatch } from '../../src/shared/normalization';

describe('normaliseForMatch', () => {
  it('handles empty or undefined string', () => {
    expect(normaliseForMatch('')).toBe('');
    expect(normaliseForMatch(null as unknown as string)).toBe('');
  });

  it('strips Wikipedia citation markers like [1], [20], [citation needed], [edit]', () => {
    const raw = 'India has a rich history[1][20] and diverse culture[citation needed]. [edit]';
    const normalized = normaliseForMatch(raw);
    expect(normalized).toBe('india has a rich history and diverse culture.');
  });

  it('normalizes smart quotes, apostrophes, and typographic dashes', () => {
    const raw = '“India’s culture—spanning millennia—is unique”';
    const normalized = normaliseForMatch(raw);
    expect(normalized).toBe('"india\'s culture-spanning millennia-is unique"');
  });

  it('strips zero-width characters and replaces non-breaking spaces', () => {
    const raw = 'Hello\u200B\u00A0World\u00AD!';
    const normalized = normaliseForMatch(raw);
    expect(normalized).toBe('hello world!');
  });

  it('collapses multiple whitespace characters and trims', () => {
    const raw = '   Multiple    spaces \n and \t newlines   ';
    const normalized = normaliseForMatch(raw);
    expect(normalized).toBe('multiple spaces and newlines');
  });

  it('preserves uppercase when lowercase: false is passed', () => {
    const raw = 'Republic of India[1]';
    const normalized = normaliseForMatch(raw, { lowercase: false });
    expect(normalized).toBe('Republic of India');
  });
});

describe('tokenizeForMatch', () => {
  it('tokenizes normalized words', () => {
    const raw = 'India is located in South Asia[12].';
    const tokens = tokenizeForMatch(raw);
    expect(tokens).toEqual(['india', 'is', 'located', 'in', 'south', 'asia.']);
  });
});
