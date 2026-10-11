import { z } from 'zod';

export const SiteTypeSchema = z.enum(['leetcode', 'codeforces', 'generic']);

export const PageContextSchema = z.object({
  url: z.string().min(1, 'Hashed URL key required'),
  site: SiteTypeSchema,
  title: z.string().min(1, 'Problem title required'),
  statementText: z.string().max(16000, 'Statement text exceeds budget'),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Unknown']).optional(),
  isContest: z.boolean().default(false),
  detectedAt: z.number().int().positive(),
});

export type SiteType = z.infer<typeof SiteTypeSchema>;
export type PageContext = z.infer<typeof PageContextSchema>;
