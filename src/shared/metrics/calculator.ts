import type { EventLogEntry } from '../schemas/events';
import type { StoredHint } from '../storage/db';
import type { BanditStats } from '../schemas/mastery';
import type { LocalMetricsSummary } from './types';

export interface GenerationTelemetry {
  latencyMs?: number;
  retries?: number;
  isFallback?: boolean;
}

/**
 * Computes a given percentile (0..100) from an array of numbers using linear interpolation.
 */
export function calculatePercentile(numbers: number[], p: number): number {
  if (numbers.length === 0) return 0;
  if (numbers.length === 1) return numbers[0]!;

  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  const lowerVal = sorted[lower] ?? 0;
  const upperVal = sorted[upper] ?? lowerVal;

  return Math.round((lowerVal * (1 - weight) + upperVal * weight) * 100) / 100;
}

/**
 * Pure calculator that computes all 8 Step 15 metrics from local records.
 */
export function calculateMetricsFromRecords(
  events: EventLogEntry[] = [],
  hints: StoredHint[] = [],
  banditStats: BanditStats = {},
  traces: GenerationTelemetry[] = []
): LocalMetricsSummary {
  // 1. Nudge Metrics
  let offeredCount = 0;
  let acceptedCount = 0;
  let dismissedCount = 0;
  let ignoredCount = 0;

  for (const evt of events) {
    if (evt.type === 'nudge_offered') {
      offeredCount++;
    } else if (evt.type === 'nudge_accepted') {
      acceptedCount++;
    } else if (evt.type === 'nudge_dismissed') {
      dismissedCount++;
    } else if (evt.type === 'nudge_ignored') {
      ignoredCount++;
    } else if (evt.type === 'feedback_submitted') {
      const action = evt.details?.action;
      if (action === 'accept') acceptedCount++;
      else if (action === 'dismiss') dismissedCount++;
      else if (action === 'ignore') ignoredCount++;
    }
  }

  // Cross-reference with contextual bandit totals (which survive event log trims)
  let banditAccept = 0;
  let banditDismiss = 0;
  let banditIgnore = 0;
  for (const bucket of Object.values(banditStats)) {
    banditAccept += bucket.accept || 0;
    banditDismiss += bucket.dismiss || 0;
    banditIgnore += bucket.ignore || 0;
  }

  const finalAccepted = Math.max(acceptedCount, banditAccept);
  const finalDismissed = Math.max(dismissedCount, banditDismiss);
  const finalIgnored = Math.max(ignoredCount, banditIgnore);
  const totalNudgeResponses = finalAccepted + finalDismissed + finalIgnored;
  const finalOffered = Math.max(offeredCount, totalNudgeResponses);

  const nudgeAcceptanceRate =
    totalNudgeResponses > 0
      ? Math.round((finalAccepted / totalNudgeResponses) * 1000) / 1000
      : 0;
  const nudgeDismissRate =
    totalNudgeResponses > 0
      ? Math.round((finalDismissed / totalNudgeResponses) * 1000) / 1000
      : 0;
  const nudgeIgnoreRate =
    totalNudgeResponses > 0
      ? Math.round((finalIgnored / totalNudgeResponses) * 1000) / 1000
      : 0;

  // 2. Solve Metrics & Time-to-Solve
  const solveEvents = events.filter((e) => e.type === 'problem_solved');
  const solvedProblemsCount = solveEvents.length;

  const timesToSolve: number[] = [];
  const hintsUsedInSolves: number[] = [];

  for (const s of solveEvents) {
    const timeTaken = s.details?.timeTakenMs;
    if (typeof timeTaken === 'number' && timeTaken > 0) {
      timesToSolve.push(timeTaken);
    }
    const hintsCount = s.details?.hintsUsed;
    if (typeof hintsCount === 'number' && hintsCount >= 0) {
      hintsUsedInSolves.push(hintsCount);
    }
  }

  const timeToSolveAvgMs =
    timesToSolve.length > 0
      ? Math.round(timesToSolve.reduce((a, b) => a + b, 0) / timesToSolve.length)
      : 0;
  const timeToSolveMedianMs =
    timesToSolve.length > 0 ? calculatePercentile(timesToSolve, 50) : 0;

  let hintsPerSolve = 0;
  if (hintsUsedInSolves.length > 0) {
    hintsPerSolve =
      Math.round(
        (hintsUsedInSolves.reduce((a, b) => a + b, 0) / hintsUsedInSolves.length) * 10
      ) / 10;
  } else if (solvedProblemsCount > 0 && hints.length > 0) {
    hintsPerSolve = Math.round((hints.length / solvedProblemsCount) * 10) / 10;
  }

  // 3. Hint Ratings & Helpfulness
  const hintRatingEvents = events.filter(
    (e) => e.type === 'feedback_submitted' && typeof e.details?.helpful === 'boolean'
  );
  const totalHintRatings = hintRatingEvents.length;
  const helpfulRatingsCount = hintRatingEvents.filter(
    (e) => e.details?.helpful === true
  ).length;

  const hintHelpfulnessRate =
    totalHintRatings > 0
      ? Math.round((helpfulRatingsCount / totalHintRatings) * 1000) / 1000
      : 0;

  const deliveredHintEvents = events.filter((e) => e.type === 'hint_delivered');
  const totalHintsDelivered = Math.max(hints.length, deliveredHintEvents.length);

  // 4. Performance, Latency & Critic Rejections
  const latencies: number[] = [];
  let criticRejections = 0;
  let fallbacks = 0;
  let telemetryItemsCount = 0;

  // Process traces
  for (const trace of traces) {
    telemetryItemsCount++;
    if (typeof trace.latencyMs === 'number' && trace.latencyMs > 0) {
      latencies.push(trace.latencyMs);
    }
    if (typeof trace.retries === 'number' && trace.retries > 0) {
      criticRejections++;
    }
    if (trace.isFallback) {
      fallbacks++;
    }
  }

  // Also process delivered hint event details if traces are fewer
  for (const evt of deliveredHintEvents) {
    if (traces.length === 0) {
      telemetryItemsCount++;
      const lat = evt.details?.latencyMs;
      if (typeof lat === 'number' && lat > 0) {
        latencies.push(lat);
      }
      const retries = evt.details?.retries;
      if (typeof retries === 'number' && retries > 0) {
        criticRejections++;
      }
      if (evt.details?.isFallback) {
        fallbacks++;
      }
    }
  }

  const totalGenerations = Math.max(telemetryItemsCount, totalHintsDelivered);

  const latencyP50Ms = latencies.length > 0 ? calculatePercentile(latencies, 50) : 0;
  const latencyP95Ms = latencies.length > 0 ? calculatePercentile(latencies, 95) : 0;

  const criticRejectionRate =
    totalGenerations > 0
      ? Math.round((criticRejections / totalGenerations) * 1000) / 1000
      : 0;
  const fallbackRate =
    totalGenerations > 0
      ? Math.round((fallbacks / totalGenerations) * 1000) / 1000
      : 0;

  // 5. Problem Attempt, Hint View & Solution Telemetry
  const problemMap = new Map<
    string,
    {
      id: string;
      title?: string;
      attempted: boolean;
      hintsFromDb: number;
      hintsFromEvents: number;
      solutionViewed: boolean;
      solved: boolean;
      lastActivity: number;
    }
  >();

  // Process hints
  for (const h of hints) {
    const pId = h.problemHash || 'unknown-problem';
    let entry = problemMap.get(pId);
    if (!entry) {
      entry = {
        id: pId,
        title: pId.replace(/^(leetcode|codeforces|wikipedia):/, '').replace(/-/g, ' '),
        attempted: true,
        hintsFromDb: 0,
        hintsFromEvents: 0,
        solutionViewed: false,
        solved: false,
        lastActivity: h.timestamp || 0,
      };
      problemMap.set(pId, entry);
    }
    entry.hintsFromDb++;
    const hLevel = (h as any).level ?? h.hint?.level;
    if (hLevel === 4) {
      entry.solutionViewed = true;
    }
    if (h.timestamp && h.timestamp > entry.lastActivity) {
      entry.lastActivity = h.timestamp;
    }
  }

  // Process events
  let hintViewedEventsCount = 0;
  let solutionViewedEventsCount = 0;

  for (const evt of events) {
    const pId = evt.contextHash || 'unknown-problem';
    if (!pId || pId === 'unknown') continue;

    let entry = problemMap.get(pId);
    if (!entry) {
      entry = {
        id: pId,
        title: evt.title || pId.replace(/^(leetcode|codeforces|wikipedia):/, '').replace(/-/g, ' '),
        attempted: false,
        hintsFromDb: 0,
        hintsFromEvents: 0,
        solutionViewed: false,
        solved: false,
        lastActivity: evt.timestamp,
      };
      problemMap.set(pId, entry);
    }

    if (evt.timestamp > entry.lastActivity) {
      entry.lastActivity = evt.timestamp;
    }

    if (evt.type === 'problem_opened') {
      entry.attempted = true;
      if (evt.title && !entry.title) entry.title = evt.title;
    } else if (evt.type === 'hint_viewed') {
      entry.attempted = true;
      entry.hintsFromEvents++;
      hintViewedEventsCount++;
      const lvl = evt.details?.level;
      if (lvl === 4) {
        entry.solutionViewed = true;
      }
    } else if (evt.type === 'solution_viewed') {
      entry.attempted = true;
      entry.solutionViewed = true;
      solutionViewedEventsCount++;
    } else if (evt.type === 'problem_solved') {
      entry.solved = true;
      entry.attempted = true;
    }
  }

  const problemsAttempted = problemMap.size;
  const hintsViewed = Math.max(hintViewedEventsCount, totalHintsDelivered);
  const solutionsViewedByHints = hints.filter((h) => ((h as any).level ?? h.hint?.level) === 4).length;
  const fullSolutionsViewed = Math.max(solutionViewedEventsCount, solutionsViewedByHints);

  const recentProblemRecords = Array.from(problemMap.values())
    .map((e) => ({
      id: e.id,
      title: e.title,
      attempted: e.attempted,
      hintsViewed: Math.max(e.hintsFromDb, e.hintsFromEvents),
      solutionViewed: e.solutionViewed,
      solved: e.solved,
      lastActivity: e.lastActivity,
    }))
    .sort((a, b) => b.lastActivity - a.lastActivity)
    .slice(0, 10);

  return {
    nudgesOffered: finalOffered,
    nudgesAccepted: finalAccepted,
    nudgesDismissed: finalDismissed,
    nudgesIgnored: finalIgnored,
    nudgeAcceptanceRate,
    nudgeDismissRate,
    nudgeIgnoreRate,
    solvedProblemsCount,
    timeToSolveAvgMs,
    timeToSolveMedianMs,
    hintsPerSolve,
    hintHelpfulnessRate,
    totalHintRatings,
    totalHintsDelivered,
    totalGenerations,
    latencyP50Ms,
    latencyP95Ms,
    criticRejectionRate,
    fallbackRate,
    problemsAttempted,
    hintsViewed,
    fullSolutionsViewed,
    recentProblemRecords,
    calculatedAt: Date.now(),
  };
}

/**
 * Formats LocalMetricsSummary as pretty JSON.
 */
export function exportMetricsJson(metrics: LocalMetricsSummary): string {
  return JSON.stringify(metrics, null, 2);
}

/**
 * Formats LocalMetricsSummary as a structured CSV string.
 */
export function exportMetricsCsv(metrics: LocalMetricsSummary): string {
  const lines: string[] = [
    'Metric Category,Metric Name,Value,Unit / Description',
    `Nudges,Nudges Offered,${metrics.nudgesOffered},Count`,
    `Nudges,Nudges Accepted,${metrics.nudgesAccepted},Count`,
    `Nudges,Nudges Dismissed,${metrics.nudgesDismissed},Count`,
    `Nudges,Nudges Ignored,${metrics.nudgesIgnored},Count`,
    `Nudges,Nudge Acceptance Rate,${(metrics.nudgeAcceptanceRate * 100).toFixed(1)}%,Ratio`,
    `Nudges,Nudge Dismiss Rate,${(metrics.nudgeDismissRate * 100).toFixed(1)}%,Ratio`,
    `Nudges,Nudge Ignore Rate,${(metrics.nudgeIgnoreRate * 100).toFixed(1)}%,Ratio`,
    `Solves,Solved Problems Count,${metrics.solvedProblemsCount},Count`,
    `Solves,Time-to-Solve (Mean),${Math.round(metrics.timeToSolveAvgMs / 1000)},Seconds`,
    `Solves,Time-to-Solve (Median p50),${Math.round(metrics.timeToSolveMedianMs / 1000)},Seconds`,
    `Solves,Hints per Solve,${metrics.hintsPerSolve.toFixed(1)},Average count`,
    `Hints,Hint Helpfulness Rating,${(metrics.hintHelpfulnessRate * 100).toFixed(1)}%,Positive %`,
    `Hints,Total Hint Ratings,${metrics.totalHintRatings},Count`,
    `Hints,Total Hints Delivered,${metrics.totalHintsDelivered},Count`,
    `Performance,Total Hint Generations,${metrics.totalGenerations},Count`,
    `Performance,Latency p50,${metrics.latencyP50Ms},Milliseconds`,
    `Performance,Latency p95,${metrics.latencyP95Ms},Milliseconds`,
    `Performance,Critic Rejection Rate,${(metrics.criticRejectionRate * 100).toFixed(1)}%,Ratio`,
    `Performance,Fallback Rate,${(metrics.fallbackRate * 100).toFixed(1)}%,Ratio`,
  ];

  return lines.join('\n');
}

/**
 * Formats LocalMetricsSummary as a structured Markdown table.
 */
export function exportMetricsMarkdown(metrics: LocalMetricsSummary): string {
  const lines: string[] = [
    '# Unstuck Local Metrics Summary',
    '',
    `*Generated at: ${new Date(metrics.calculatedAt).toISOString()}*`,
    '',
    '| Category | Metric Name | Value | Unit / Description |',
    '|---|---|---|---|',
    `| Nudges | Nudges Offered | ${metrics.nudgesOffered} | Count |`,
    `| Nudges | Nudges Accepted | ${metrics.nudgesAccepted} | Count |`,
    `| Nudges | Nudges Dismissed | ${metrics.nudgesDismissed} | Count |`,
    `| Nudges | Nudges Ignored | ${metrics.nudgesIgnored} | Count |`,
    `| Nudges | Nudge Acceptance Rate | ${(metrics.nudgeAcceptanceRate * 100).toFixed(1)}% | Ratio |`,
    `| Nudges | Nudge Dismiss Rate | ${(metrics.nudgeDismissRate * 100).toFixed(1)}% | Ratio |`,
    `| Nudges | Nudge Ignore Rate | ${(metrics.nudgeIgnoreRate * 100).toFixed(1)}% | Ratio |`,
    `| Solves | Solved Problems Count | ${metrics.solvedProblemsCount} | Count |`,
    `| Solves | Time-to-Solve (Mean) | ${Math.round(metrics.timeToSolveAvgMs / 1000)}s | Seconds |`,
    `| Solves | Time-to-Solve (Median p50) | ${Math.round(metrics.timeToSolveMedianMs / 1000)}s | Seconds |`,
    `| Solves | Hints per Solve | ${metrics.hintsPerSolve.toFixed(1)} | Average count |`,
    `| Hints | Hint Helpfulness Rating | ${(metrics.hintHelpfulnessRate * 100).toFixed(1)}% | Positive % |`,
    `| Hints | Total Hint Ratings | ${metrics.totalHintRatings} | Count |`,
    `| Hints | Total Hints Delivered | ${metrics.totalHintsDelivered} | Count |`,
    `| Performance | Total Hint Generations | ${metrics.totalGenerations} | Count |`,
    `| Performance | Latency p50 | ${metrics.latencyP50Ms}ms | Milliseconds |`,
    `| Performance | Latency p95 | ${metrics.latencyP95Ms}ms | Milliseconds |`,
    `| Performance | Critic Rejection Rate | ${(metrics.criticRejectionRate * 100).toFixed(1)}% | Ratio |`,
    `| Performance | Fallback Rate | ${(metrics.fallbackRate * 100).toFixed(1)}% | Ratio |`,
  ];

  return lines.join('\n');
}
