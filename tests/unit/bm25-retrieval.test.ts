import { describe, it, expect } from 'vitest';
import { BM25Retriever, retrieveRelevantSections, tokenizeText } from '../../src/shared/retrieval/bm25';
import type { PageSection } from '../../src/shared/schemas/context';

describe('BM25 Lexical Section Retrieval', () => {
  describe('tokenizeText', () => {
    it('lowercases and extracts alphanumeric tokens >= 2 chars', () => {
      const tokens = tokenizeText('Binary Search Trees in TypeScript! (v1.0.4)');
      expect(tokens).toContain('binary');
      expect(tokens).toContain('search');
      expect(tokens).toContain('trees');
      expect(tokens).toContain('typescript');
      expect(tokens).not.toContain('a');
      expect(tokens).not.toContain('!');
    });

    it('handles empty strings and whitespace cleanly', () => {
      expect(tokenizeText('')).toEqual([]);
      expect(tokenizeText('   \n\t  ')).toEqual([]);
    });
  });

  describe('BM25Retriever scoring & ranking', () => {
    const testSections: PageSection[] = [
      {
        id: 'sec-1',
        title: 'Introduction to Dynamic Programming',
        text: 'Dynamic programming is an algorithmic technique for solving problems by breaking them down into simpler subproblems and storing intermediate results.',
      },
      {
        id: 'sec-2',
        title: 'Binary Search Algorithm',
        text: 'Binary search is an efficient algorithm for finding an item from a sorted list of items. It works by repeatedly dividing in half the portion of the list.',
      },
      {
        id: 'sec-3',
        title: 'Graph Traversal Depth First Search',
        text: 'Depth-first search is an algorithm for traversing or searching tree or graph data structures using recursion or a stack.',
      },
      {
        id: 'sec-4',
        title: 'Binary Search Tree Data Structure',
        text: 'A binary search tree is a rooted binary tree data structure with the key of each internal node being greater than all keys in the left subtree.',
      },
      {
        id: 'sec-5',
        title: 'Conclusion and References',
        text: 'For more information, see standard textbooks on computer science and algorithms.',
      },
    ];

    it('correctly ranks binary search sections for "binary search" query', () => {
      const retriever = new BM25Retriever(testSections);
      const results = retriever.search('binary search tree', 3);

      expect(results.length).toBe(3);
      // Section 4 (Binary Search Tree) should score highest as it matches all query terms
      expect(results[0]!.section.id).toBe('sec-4');
      expect(results[0]!.score).toBeGreaterThan(0);

      // Section 2 (Binary Search Algorithm) should rank second
      expect(results[1]!.section.id).toBe('sec-2');
      expect(results[1]!.score).toBeGreaterThan(0);

      // Results must be sorted in descending order of score
      expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score);
    });

    it('correctly ranks dynamic programming section for "subproblems" query', () => {
      const retriever = new BM25Retriever(testSections);
      const results = retriever.search('simpler subproblems cache technique', 2);

      expect(results.length).toBe(1);
      expect(results[0]!.section.id).toBe('sec-1');
      expect(results[0]!.score).toBeGreaterThan(0);
    });

    it('handles zero indexed sections gracefully', () => {
      const retriever = new BM25Retriever([]);
      const results = retriever.search('binary search', 3);
      expect(results).toEqual([]);
    });

    it('handles empty query string by returning topK head slice with score 0', () => {
      const retriever = new BM25Retriever(testSections);
      const results = retriever.search('', 2);
      expect(results.length).toBe(2);
      expect(results[0]!.score).toBe(0);
      expect(results[0]!.section.id).toBe('sec-1');
    });
  });

  describe('retrieveRelevantSections helper', () => {
    const testSections: PageSection[] = [
      {
        id: 'sec-a',
        title: 'Merge Sort',
        text: 'Merge sort is an efficient, general-purpose, and comparison-based sorting algorithm. Most implementations produce a stable sort.',
      },
      {
        id: 'sec-b',
        title: 'Quick Sort',
        text: 'Quicksort is an in-place sorting algorithm developed by British computer scientist Tony Hoare.',
      },
      {
        id: 'sec-c',
        title: 'Hash Tables',
        text: 'A hash table is a data structure that implements an associative array abstract data type using a hash function.',
      },
    ];

    it('returns formatted section strings matching the query', () => {
      const { retrieved } = retrieveRelevantSections('Tony Hoare quicksort in-place', testSections, 2);
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0]!.title).toContain('Quick Sort');
      expect(retrieved[0]!.text).toContain('Tony Hoare');
    });

    it('handles empty query or non-matching terms gracefully', () => {
      const { retrieved } = retrieveRelevantSections('quantum physics neutrino entanglement', testSections, 2);
      expect(retrieved).toBeDefined();
    });

    it('respects topK parameter', () => {
      const { retrieved } = retrieveRelevantSections('sort algorithm', testSections, 1);
      expect(retrieved.length).toBeLessThanOrEqual(1);
    });
  });
});
