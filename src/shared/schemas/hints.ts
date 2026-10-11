import { z } from 'zod';

export const HintLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4)
]);

export const CriticChecksSchema = z.object({
  leak: z.boolean(),
  grounded: z.boolean(),
  relevant: z.boolean(),
});

export const HintSchema = z.object({
  id: z.string().optional(),
  level: HintLevelSchema,
  text: z.string().min(1, 'Hint text cannot be empty'),
  codeBlock: z.string().optional(),
  groundedQuote: z.string().optional(),
  confidence: z.number().min(0).max(1),
  checks: CriticChecksSchema,
  retries: z.number().int().min(0).default(0),
  model: z.string().min(1),
  latencyMs: z.number().min(0),
});

export type HintLevel = z.infer<typeof HintLevelSchema>;
export type CriticChecks = z.infer<typeof CriticChecksSchema>;
export type Hint = z.infer<typeof HintSchema>;
