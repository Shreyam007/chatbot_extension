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

  // Mastery & Problem Attempt Telemetry
  problemsAttempted: z.number().int().nonnegative().default(0),
  hintsViewed: z.number().int().nonnegative().default(0),
  fullSolutionsViewed: z.number().int().nonnegative().default(0),
  recentProblemRecords: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        attempted: z.boolean().default(true),
        hintsViewed: z.number().int().nonnegative().default(0),
        solutionViewed: z.boolean().default(false),
        solved: z.boolean().default(false),
        lastActivity: z.number().int().optional(),
      })
    )
    .default([]),

  calculatedAt: z.number().int().positive(),
});

export type LocalMetricsSummary = z.infer<typeof LocalMetricsSummarySchema>;
export type RecentProblemRecord = z.infer<typeof LocalMetricsSummarySchema>['recentProblemRecords'][number];
