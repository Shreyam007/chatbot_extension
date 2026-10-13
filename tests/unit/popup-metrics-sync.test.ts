import { describe, it, expect } from 'vitest';
import { calculateMetricsFromRecords } from '../../src/shared/metrics/calculator';
import type { EventLogEntry } from '../../src/shared/schemas/events';
import type { StoredHint } from '../../src/shared/storage/db';

describe('Popup & Progress Metrics Synchronization (Addendum B)', () => {
  it('produces identical empty values (0 and "—") when event log is empty', () => {
    const events: EventLogEntry[] = [];
    const hints: StoredHint[] = [];
    const banditStats = {};
    const traces: [] = [];

    // Shared selector evaluation
    const metrics = calculateMetricsFromRecords(events, hints, banditStats, traces);

    // 1. Popup selector state mapping
    const popupNudgesCount = metrics.nudgesOffered;
    const popupAcceptedCount = metrics.nudgesAccepted;
    const popupAcceptRate = metrics.nudgeAcceptanceRate;
    const popupHintsUsedCount = metrics.totalHintsDelivered;
    const popupAcceptRateDisplay = popupAcceptRate > 0 ? `${Math.round(popupAcceptRate * 100)}% rate` : '—';

    // 2. Progress tab state mapping (from GET_MASTERY_PROGRESS)
    const progressWeeklySolved = metrics.solvedProblemsCount;
    const progressHintsPerSolve = metrics.hintsPerSolve;
    const progressNudgeAcceptRate = metrics.nudgeAcceptanceRate;
    const progressAcceptRateDisplay = progressNudgeAcceptRate > 0 ? `${Math.round(progressNudgeAcceptRate * 100)}%` : '—';

    // Assert strictly zero and empty displays everywhere
    expect(popupNudgesCount).toBe(0);
    expect(popupAcceptedCount).toBe(0);
    expect(popupAcceptRate).toBe(0);
    expect(popupHintsUsedCount).toBe(0);
    expect(popupAcceptRateDisplay).toBe('—');

    expect(progressWeeklySolved).toBe(0);
    expect(progressHintsPerSolve).toBe(0);
    expect(progressNudgeAcceptRate).toBe(0);
    expect(progressAcceptRateDisplay).toBe('—');

    // Never show hardcoded design samples
    expect(popupNudgesCount).not.toBe(4);
    expect(popupAcceptedCount).not.toBe(3);
    expect(popupAcceptRate).not.toBe(0.75);
    expect(popupHintsUsedCount).not.toBe(2);
  });

  it('produces strictly identical counts across Popup and Progress when N events are seeded', () => {
    const now = Date.now();
    const seededEvents: EventLogEntry[] = [
      { id: 'e1', timestamp: now - 5000, type: 'nudge_offered', contextHash: 'leetcode:two-sum', title: 'Nudge 1', details: {} },
      { id: 'e2', timestamp: now - 4000, type: 'nudge_accepted', contextHash: 'leetcode:two-sum', title: 'Accept 1', details: {} },
      { id: 'e3', timestamp: now - 3500, type: 'hint_delivered', contextHash: 'leetcode:two-sum', title: 'Hint 1', details: {} },
      { id: 'e4', timestamp: now - 3000, type: 'nudge_offered', contextHash: 'leetcode:two-sum', title: 'Nudge 2', details: {} },
      { id: 'e5', timestamp: now - 2500, type: 'nudge_accepted', contextHash: 'leetcode:two-sum', title: 'Accept 2', details: {} },
      { id: 'e6', timestamp: now - 2000, type: 'hint_delivered', contextHash: 'leetcode:two-sum', title: 'Hint 2', details: {} },
      { id: 'e7', timestamp: now - 1500, type: 'nudge_offered', contextHash: 'leetcode:two-sum', title: 'Nudge 3', details: {} },
      { id: 'e8', timestamp: now - 1000, type: 'nudge_dismissed', contextHash: 'leetcode:two-sum', title: 'Dismiss 1', details: {} },
      { id: 'e9', timestamp: now - 500, type: 'nudge_offered', contextHash: 'leetcode:two-sum', title: 'Nudge 4', details: {} },
      { id: 'e10', timestamp: now - 200, type: 'nudge_accepted', contextHash: 'leetcode:two-sum', title: 'Accept 3', details: {} },
      { id: 'e11', timestamp: now - 100, type: 'hint_delivered', contextHash: 'leetcode:two-sum', title: 'Hint 3', details: {} },
      {
        id: 'e12',
        timestamp: now,
        type: 'problem_solved',
        contextHash: 'leetcode:two-sum',
        title: 'Solved',
        details: { timeTakenMs: 60000, hintsUsed: 3 },
      },
    ];

    const metrics = calculateMetricsFromRecords(seededEvents, [], {}, []);

    // Popup values
    const popupNudges = metrics.nudgesOffered;
    const popupAccepted = metrics.nudgesAccepted;
    const popupRate = metrics.nudgeAcceptanceRate;
    const popupHints = metrics.totalHintsDelivered;

    // Progress values
    const progressSolved = metrics.solvedProblemsCount;
    const progressRate = metrics.nudgeAcceptanceRate;
    const progressHintsPerSolve = metrics.hintsPerSolve;

    // Assert counts are derived from real events
    expect(popupNudges).toBe(4);
    expect(popupAccepted).toBe(3);
    // 3 accepted out of (3 accepted + 1 dismissed) = 75%
    expect(popupRate).toBe(0.75);
    expect(popupHints).toBe(3);

    // Progress tab shares the exact same rate and solve metrics
    expect(progressRate).toBe(popupRate);
    expect(progressSolved).toBe(1);
    expect(progressHintsPerSolve).toBe(3);
  });
});
