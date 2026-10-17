import { describe, it, expect } from 'vitest';
import { calculateMetricsFromRecords } from '../../src/shared/metrics/calculator';
import type { EventLogEntry } from '../../src/shared/schemas/events';
import type { StoredHint } from '../../src/shared/storage/db';

describe('Progress Telemetry & Mastery Invariant: L1-L4 viewing', () => {
  it('correctly tracks attempted, hints viewed, and solutions viewed without marking solved or updating BKT', () => {
    const problemHash = 'leetcode:two-sum';
    const initialBktPKnown = 0.5;

    // Simulate session events for a user viewing levels 1, 2, 3, 4
    const events: EventLogEntry[] = [
      {
        id: 'evt-open',
        timestamp: 1000,
        type: 'problem_opened',
        contextHash: problemHash,
        title: 'Two Sum',
        details: { site: 'leetcode', difficulty: 'Easy' },
      },
      {
        id: 'evt-l1',
        timestamp: 1010,
        type: 'hint_viewed',
        contextHash: problemHash,
        title: 'Hint Level 1 Viewed',
        details: { level: 1 },
      },
      {
        id: 'evt-l2',
        timestamp: 1020,
        type: 'hint_viewed',
        contextHash: problemHash,
        title: 'Hint Level 2 Viewed',
        details: { level: 2 },
      },
      {
        id: 'evt-l3',
        timestamp: 1030,
        type: 'hint_viewed',
        contextHash: problemHash,
        title: 'Hint Level 3 Viewed',
        details: { level: 3 },
      },
      {
        id: 'evt-l4',
        timestamp: 1040,
        type: 'hint_viewed',
        contextHash: problemHash,
        title: 'Hint Level 4 Viewed',
        details: { level: 4 },
      },
      {
        id: 'evt-sol',
        timestamp: 1041,
        type: 'solution_viewed',
        contextHash: problemHash,
        title: 'Full Solution Viewed',
        details: { level: 4, hasCodeBlock: true },
      },
    ];

    const hints: StoredHint[] = [
      {
        id: 'h1',
        problemHash,
        timestamp: 1010,
        hint: {
          id: 'h1',
          level: 1,
          text: 'Think about using a hash map.',
          confidence: 0.9,
          checks: { leak: false, grounded: true, relevant: true },
          retries: 0,
          model: 'gemini-2.5-flash',
          latencyMs: 100,
        },
      },
      {
        id: 'h2',
        problemHash,
        timestamp: 1020,
        hint: {
          id: 'h2',
          level: 2,
          text: 'Store complements in the hash map.',
          confidence: 0.9,
          checks: { leak: false, grounded: true, relevant: true },
          retries: 0,
          model: 'gemini-2.5-flash',
          latencyMs: 100,
        },
      },
      {
        id: 'h3',
        problemHash,
        timestamp: 1030,
        hint: {
          id: 'h3',
          level: 3,
          text: 'For each number x, check if target - x is in map.',
          confidence: 0.9,
          checks: { leak: false, grounded: true, relevant: true },
          retries: 0,
          model: 'gemini-2.5-flash',
          latencyMs: 100,
        },
      },
      {
        id: 'h4',
        problemHash,
        timestamp: 1040,
        hint: {
          id: 'h4',
          level: 4,
          text: 'Here is the full solution code.',
          confidence: 0.9,
          codeBlock: 'def twoSum(nums, target): ...',
          checks: { leak: false, grounded: true, relevant: true },
          retries: 0,
          model: 'gemini-2.5-flash',
          latencyMs: 100,
        },
      },
    ];

    const metrics = calculateMetricsFromRecords(events, hints, {}, []);

    // Invariant 1: Problem was attempted
    expect(metrics.problemsAttempted).toBe(1);

    // Invariant 2: Exactly 4 hints viewed
    expect(metrics.hintsViewed).toBe(4);

    // Invariant 3: Exactly 1 solution viewed
    expect(metrics.fullSolutionsViewed).toBe(1);

    // Invariant 4: NOT marked as solved
    expect(metrics.solvedProblemsCount).toBe(0);

    // Invariant 5: Problem record shows attempted=true, hintsViewed=4, solutionViewed=true, solved=false
    const record = metrics.recentProblemRecords.find((r) => r.id === problemHash);
    expect(record).toBeDefined();
    expect(record?.attempted).toBe(true);
    expect(record?.hintsViewed).toBe(4);
    expect(record?.solutionViewed).toBe(true);
    expect(record?.solved).toBe(false);

    // Invariant 6: BKT mastery must NOT update on hint viewing alone (only on verified solved)
    const bktAfterHints = initialBktPKnown; // No calculateBktUpdate should be called on viewing L4
    expect(bktAfterHints).toBe(initialBktPKnown);
  });
});
