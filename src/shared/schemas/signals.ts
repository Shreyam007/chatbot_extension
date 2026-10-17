import { z } from 'zod';

export const SignalWindowSchema = z.object({
  dwellMs: z.number().min(0),
  scrollReversals: z.number().int().min(0),
  idleMs: z.number().min(0),
  wrongSubmissions: z.number().int().min(0),
  tabSwitches: z.number().int().min(0),
  activeMs: z.number().min(0),
  readingMs: z.number().min(0).optional(),
  windowStart: z.number().int().positive(),
  windowEnd: z.number().int().positive(),
}).refine((data) => data.windowEnd >= data.windowStart, {
  message: 'windowEnd must be greater than or equal to windowStart',
  path: ['windowEnd'],
});

export const StuckStateSchema = z.enum(['flowing', 'stuck', 'distracted']);

export const StuckEstimateSchema = z.object({
  p: z.number().min(0).max(1),
  state: StuckStateSchema,
  contributions: z.record(z.string(), z.number()).default({}),
  nudgeText: z.string().optional(),
  isTimeOnlyTrigger: z.boolean().optional(),
});

export const NudgeDecisionSchema = z.object({
  show: z.boolean(),
  reason: z.string(),
  utility: z.number(),
  cost: z.number(),
  contextBucket: z.string(),
  nudgeText: z.string().optional(),
});

export type SignalWindow = z.infer<typeof SignalWindowSchema>;
export type StuckState = z.infer<typeof StuckStateSchema>;
export type StuckEstimate = z.infer<typeof StuckEstimateSchema>;
export type NudgeDecision = z.infer<typeof NudgeDecisionSchema>;
