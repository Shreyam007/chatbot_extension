import { describe, it, expect } from 'vitest';
import { isBroadSummaryIntent } from '../../src/shared/retrieval/intent';

describe('Broad Summary Intent Detection (English & Hinglish)', () => {
  describe('English broad summary queries', () => {
    const positiveQueries = [
      'explain me about this page',
      'explain me about this fellowship all details on this page in short points',
      'can you summarize this article',
      'give me an overview of this page',
      'tell me everything on this page',
      'summarise the key points',
      'all details in brief',
      'what is this page about',
      'what is the structure of this site',
    ];

    it.each(positiveQueries)('identifies "%s" as broad summary intent', (query) => {
      expect(isBroadSummaryIntent(query)).toBe(true);
    });
  });

  describe('Hinglish broad summary queries', () => {
    const hinglishQueries = [
      'is page ke baare me sab batao',
      'points me samjhao',
      'kya likha hai isme',
      'pura page summarize kardo',
      'details batao short me',
      'overview do bhai',
    ];

    it.each(hinglishQueries)('identifies "%s" as broad summary intent', (query) => {
      expect(isBroadSummaryIntent(query)).toBe(true);
    });
  });

  describe('Specific non-summary queries (should be false)', () => {
    const negativeQueries = [
      'how do I solve two sum in O(n)?',
      'what is the time complexity of binary search?',
      'check if my edge case handling is correct',
      'why did test case 3 fail?',
      'how to reverse a linked list in python',
    ];

    it.each(negativeQueries)('does NOT identify "%s" as broad summary intent', (query) => {
      expect(isBroadSummaryIntent(query)).toBe(false);
    });
  });
});
