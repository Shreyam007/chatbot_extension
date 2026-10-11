import { describe, it, expect } from 'vitest';
import {
  calculatePercentile,
  calculateMetricsFromRecords,
  exportMetricsJson,
  exportMetricsCsv,
  exportMetricsMarkdown,
} from '../../src/shared/metrics/calculator';
import { LocalMetricsSummarySchema } from '../../src/shared/metrics/types';
import type { EventLogEntry } from '../../src/shared/schemas/events';

describe('Step 15: Local Metrics Calculator & Export', () => {
  it('correctly calculates percentiles with linear interpolation', () => {
    expect(calculatePercentile([], 50)).toBe(0);
    expect(calculatePercentile([100], 50)).toBe(100);

    const values = [10, 20, 30, 40, 50];
    expect(calculatePercentile(values, 0)).toBe(10);
    expect(calculatePercentile(values, 50)).toBe(30);
    expect(calculatePercentile(values, 100)).toBe(50);
  });

  it('computes 0 defaults cleanly on empty datasets', () => {
    const metrics = calculateMetricsFromRecords([], [], {}, []);
    const parsed = LocalMetricsSummarySchema.safeParse(metrics);

    expect(parsed.success).toBe(true);
    expect(metrics.nudgesOffered).toBe(0);
    expect(metrics.nudgeAcceptanceRate).toBe(0);
    expect(metrics.solvedProblemsCount).toBe(0);
    expect(metrics.timeToSolveAvgMs).toBe(0);
    expect(metrics.hintsPerSolve).toBe(0);
    expect(metrics.hintHelpfulnessRate).toBe(0);
    expect(metrics.latencyP50Ms).toBe(0);
    expect(metrics.criticRejectionRate).toBe(0);
    expect(metrics.fallbackRate).toBe(0);
  });

  it('computes nudge acceptance, dismiss, and ignore rates accurately', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 'e1',
        timestamp: 1000,
        type: 'nudge_offered',
        contextHash: 'prob-1',
        title: 'Nudge 1',
        details: {},
      },
      {
        id: 'e2',
        timestamp: 1010,
        type: 'nudge_offered',
        contextHash: 'prob-1',
        title: 'Nudge 2',
        details: {},
      },
      {
        id: 'e3',
        timestamp: 1020,
        type: 'feedback_submitted',
        contextHash: 'prob-1',
        title: 'Accept',
        details: { action: 'accept' },
      },
      {
        id: 'e4',
        timestamp: 1030,
        type: 'feedback_submitted',
        contextHash: 'prob-1',
        title: 'Dismiss',
        details: { action: 'dismiss' },
      },
      {
        id: 'e5',
        timestamp: 1040,
        type: 'feedback_submitted',
        contextHash: 'prob-1',
        title: 'Ignore',
        details: { action: 'ignore' },
      },
      {
        id: 'e6',
        timestamp: 1050,
        type: 'feedback_submitted',
        contextHash: 'prob-1',
        title: 'Accept 2',
        details: { action: 'accept' },
      },
    ];

    const metrics = calculateMetricsFromRecords(mockEvents, [], {}, []);
    expect(metrics.nudgesAccepted).toBe(2);
    expect(metrics.nudgesDismissed).toBe(1);
    expect(metrics.nudgesIgnored).toBe(1);
    // 2 / 4 = 0.50
    expect(metrics.nudgeAcceptanceRate).toBe(0.5);
    // 1 / 4 = 0.25
    expect(metrics.nudgeDismissRate).toBe(0.25);
    expect(metrics.nudgeIgnoreRate).toBe(0.25);
  });

  it('preserves historical bandit counts if event logs were trimmed', () => {
    const banditStats = {
      'leetcode:two-sum': { accept: 15, dismiss: 3, ignore: 2, n: 20 },
    };

    // Events array is empty (e.g. wiped or trimmed)
    const metrics = calculateMetricsFromRecords([], [], banditStats, []);
    expect(metrics.nudgesAccepted).toBe(15);
    expect(metrics.nudgesDismissed).toBe(3);
    expect(metrics.nudgesIgnored).toBe(2);
    // 15 / 20 = 0.75
    expect(metrics.nudgeAcceptanceRate).toBe(0.75);
    expect(metrics.nudgeDismissRate).toBe(0.15);
    expect(metrics.nudgeIgnoreRate).toBe(0.1);
  });

  it('calculates average and median time-to-solve and hints per solve', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 's1',
        timestamp: 2000,
        type: 'problem_solved',
        contextHash: 'p1',
        title: 'Two Sum',
        details: { timeTakenMs: 60000, hintsUsed: 2 },
      },
      {
        id: 's2',
        timestamp: 4000,
        type: 'problem_solved',
        contextHash: 'p2',
        title: 'Valid Parentheses',
        details: { timeTakenMs: 120000, hintsUsed: 4 },
      },
      {
        id: 's3',
        timestamp: 6000,
        type: 'problem_solved',
        contextHash: 'p3',
        title: 'Merge Lists',
        details: { timeTakenMs: 180000, hintsUsed: 0 },
      },
    ];

    const metrics = calculateMetricsFromRecords(mockEvents, [], {}, []);
    expect(metrics.solvedProblemsCount).toBe(3);
    // (60000 + 120000 + 180000) / 3 = 120000ms
    expect(metrics.timeToSolveAvgMs).toBe(120000);
    expect(metrics.timeToSolveMedianMs).toBe(120000);
    // (2 + 4 + 0) / 3 = 2.0
    expect(metrics.hintsPerSolve).toBe(2.0);
  });

  it('calculates hint helpfulness rating correctly', () => {
    const mockEvents: EventLogEntry[] = [
      {
        id: 'f1',
        timestamp: 1000,
        type: 'feedback_submitted',
        contextHash: 'hint-1',
        title: 'Rating',
        details: { helpful: true },
      },
      {
        id: 'f2',
        timestamp: 1001,
        type: 'feedback_submitted',
        contextHash: 'hint-2',
        title: 'Rating',
        details: { helpful: true },
      },
      {
        id: 'f3',
        timestamp: 1002,
        type: 'feedback_submitted',
        contextHash: 'hint-3',
        title: 'Rating',
        details: { helpful: false },
      },
      {
        id: 'f4',
        timestamp: 1003,
        type: 'feedback_submitted',
        contextHash: 'hint-4',
        title: 'Rating',
        details: { helpful: true },
      },
    ];

    const metrics = calculateMetricsFromRecords(mockEvents, [], {}, []);
    expect(metrics.totalHintRatings).toBe(4);
    // 3 / 4 = 0.75
    expect(metrics.hintHelpfulnessRate).toBe(0.75);
  });

  it('calculates latency p50, p95, critic rejection rate, and fallback rate', () => {
    const traces = [
      { latencyMs: 100, retries: 0, isFallback: false },
      { latencyMs: 150, retries: 1, isFallback: false }, // 1 critic rejection
      { latencyMs: 200, retries: 0, isFallback: false },
      { latencyMs: 300, retries: 2, isFallback: true },  // 1 critic rejection + 1 fallback
    ];

    const metrics = calculateMetricsFromRecords([], [], {}, traces);
    expect(metrics.totalGenerations).toBe(4);
    // Latencies: 100, 150, 200, 300
    expect(metrics.latencyP50Ms).toBe(175);
    expect(metrics.latencyP95Ms).toBe(285);
    // 2 with retries > 0 out of 4 = 0.50
    expect(metrics.criticRejectionRate).toBe(0.5);
    // 1 fallback out of 4 = 0.25
    expect(metrics.fallbackRate).toBe(0.25);
  });

  it('exports structured JSON matching the LocalMetricsSummarySchema', () => {
    const metrics = calculateMetricsFromRecords([], [], {}, []);
    const jsonStr = exportMetricsJson(metrics);
    const parsed = JSON.parse(jsonStr);

    expect(LocalMetricsSummarySchema.safeParse(parsed).success).toBe(true);
    expect(jsonStr).toContain('"nudgeAcceptanceRate": 0');
  });

  it('exports valid CSV table with key metrics', () => {
    const metrics = calculateMetricsFromRecords([], [], {}, []);
    const csvStr = exportMetricsCsv(metrics);

    expect(csvStr).toContain('Metric Category,Metric Name,Value,Unit / Description');
    expect(csvStr).toContain('Nudges,Nudge Acceptance Rate,0.0%,Ratio');
    expect(csvStr).toContain('Performance,Critic Rejection Rate,0.0%,Ratio');
    expect(csvStr).toContain('Performance,Fallback Rate,0.0%,Ratio');
  });

  it('exports valid Markdown table with key metrics', () => {
    const metrics = calculateMetricsFromRecords([], [], {}, []);
    const mdStr = exportMetricsMarkdown(metrics);

    expect(mdStr).toContain('# Unstuck Local Metrics Summary');
    expect(mdStr).toContain('| Category | Metric Name | Value | Unit / Description |');
    expect(mdStr).toContain('| Nudges | Nudge Acceptance Rate | 0.0% | Ratio |');
    expect(mdStr).toContain('| Performance | Critic Rejection Rate | 0.0% | Ratio |');
    expect(mdStr).toContain('| Performance | Fallback Rate | 0.0% | Ratio |');
  });
});
