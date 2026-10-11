import { describe, it, expect } from 'vitest';
import {
  runEvaluation,
  formatEvaluationAsciiTable,
  formatEvaluationCsv,
  formatEvaluationMarkdownTable,
} from '../../src/evaluation/harness';
import { BENCHMARK_PROBLEMS } from '../../src/evaluation/benchmark-dataset';

describe('Step 15: Evaluation Harness & 15-Problem Benchmark Replay', () => {
  it('contains exactly 15 canonical benchmark problems', () => {
    expect(BENCHMARK_PROBLEMS).toHaveLength(15);
    const titles = BENCHMARK_PROBLEMS.map((p) => p.title);
    expect(titles).toContain('Two Sum');
    expect(titles).toContain('Valid Parentheses');
    expect(titles).toContain('Merge Two Sorted Lists');
    expect(titles).toContain('Best Time to Buy and Sell Stock');
    expect(titles).toContain('Invert Binary Tree');
    expect(titles).toContain('Maximum Subarray');
    expect(titles).toContain('Binary Search');
    expect(titles).toContain('Reverse Linked List');
    expect(titles).toContain('Climbing Stairs');
    expect(titles).toContain('Coin Change');
    expect(titles).toContain('Search in Rotated Sorted Array');
    expect(titles).toContain('Number of Islands');
    expect(titles).toContain('Longest Substring Without Repeating Characters');
    expect(titles).toContain('Course Schedule');
    expect(titles).toContain('LRU Cache');
  });

  it('executes 15-problem evaluation and asserts 0.0% code leak on L1 and L2', () => {
    const report = runEvaluation({ seed: 42 });

    expect(report.problemsCount).toBe(15);
    expect(report.totalCandidates).toBeGreaterThanOrEqual(15);

    // Definition of Done: 0 code in L1/L2 outputs
    const l1 = report.summaryByLevel['L1'];
    const l2 = report.summaryByLevel['L2'];

    expect(l1).toBeDefined();
    expect(l1?.leakRate).toBe(0.0);
    expect(l1?.leakCount).toBe(0);

    if (l2) {
      expect(l2.leakRate).toBe(0.0);
      expect(l2.leakCount).toBe(0);
    }
  });

  it('demonstrates high grounded rate and critic agreement across all candidates', () => {
    const report = runEvaluation({ seed: 42 });

    // Grounded rate must be 100% on the benchmark
    expect(report.overall.groundedRate).toBe(1.0);
    // Critic agreement must be 100% with annotated expectations
    expect(report.overall.criticAgreementRate).toBe(1.0);
    // Latencies are positive
    expect(report.overall.meanLatencyMs).toBeGreaterThan(0);
    expect(report.overall.p50LatencyMs).toBeGreaterThan(0);
  });

  it('guarantees reproducibility with a fixed seed', () => {
    const run1 = runEvaluation({ seed: 12345 });
    const run2 = runEvaluation({ seed: 12345 });

    expect(run1.overall.meanLatencyMs).toBe(run2.overall.meanLatencyMs);
    expect(run1.overall.p50LatencyMs).toBe(run2.overall.p50LatencyMs);
    expect(run1.overall.p95LatencyMs).toBe(run2.overall.p95LatencyMs);
    expect(run1.overall.leakRate).toBe(run2.overall.leakRate);
    expect(run1.overall.groundedRate).toBe(run2.overall.groundedRate);
  });

  it('formats ASCII, CSV, and Markdown exports correctly', () => {
    const report = runEvaluation({ seed: 42 });
    const ascii = formatEvaluationAsciiTable(report);
    const csv = formatEvaluationCsv(report);
    const md = formatEvaluationMarkdownTable(report);

    expect(ascii).toContain('UNSTUCK OFFLINE CRITIC BENCHMARK ON PRE-WRITTEN CANDIDATE HINTS');
    expect(ascii).toContain('TOTAL');
    expect(ascii).toContain('0.0%');

    expect(csv).toContain('Level,Evaluated,LeakRate,GroundedRate,CriticAgreementRate');
    expect(csv).toContain('Overall,');
    expect(csv).toContain('0.0%');

    expect(md).toContain('### Offline Critic Benchmark on Pre-Written Candidate Hints');
    expect(md).toContain('| Level | Evaluated | Leak Rate | Grounded % | Critic Agreement |');
    expect(md).toContain('| **Total / Overall** |');
  });
});
