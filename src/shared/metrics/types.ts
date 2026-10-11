import { z } from 'zod';

export const LocalMetricsSummarySchema = z.object({
  // Nudge Metrics
  nudgesOffered: z.number().int().nonnegative(),
  nudgesAccepted: z.number().int().nonnegative(),
  nudgesDismissed: z.number().int().nonnegative(),
  nudgesIgnored: z.number().int().nonnegative(),
  nudgeAcceptanceRate: z.number().min(0).max(1),
  nudgeDismissRate: z.number().min(0).max(1),
  nudgeIgnoreRate: z.number().min(0).max(1),

  // Problem Solve Metrics
  solvedProblemsCount: z.number().int().nonnegative(),
  timeToSolveAvgMs: z.number().nonnegative(),
  timeToSolveMedianMs: z.number().nonnegative(),
  hintsPerSolve: z.number().nonnegative(),

  // Hint Ratings & Helpfulness
  hintHelpfulnessRate: z.number().min(0).max(1),
  totalHintRatings: z.number().int().nonnegative(),
  totalHintsDelivered: z.number().int().nonnegative(),

  // LLM / Graph Performance & Reliability
  totalGenerations: z.number().int().nonnegative(),
  latencyP50Ms: z.number().nonnegative(),
  latencyP95Ms: z.number().nonnegative(),
  criticRejectionRate: z.number().min(0).max(1),
  fallbackRate: z.number().min(0).max(1),

  calculatedAt: z.number().int().positive(),
});

export type LocalMetricsSummary = z.infer<typeof LocalMetricsSummarySchema>;
