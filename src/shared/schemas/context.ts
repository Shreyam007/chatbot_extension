import { z } from 'zod';
import { LIMITS } from '../config';

export const SiteTypeSchema = z.enum(['leetcode', 'codeforces', 'generic']);

export const ContentTypeSchema = z.enum(['problem', 'article', 'documentation', 'general']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const PageSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string().max(LIMITS.MAX_SECTION_CHARS, 'Section text exceeds budget'),
});
export type PageSection = z.infer<typeof PageSectionSchema>;

export const PageContextSchema = z.object({
  url: z.string().min(1, 'Hashed URL key required'),
  site: SiteTypeSchema,
  title: z.string().min(1, 'Problem title required'),
  statementText: z.string().max(LIMITS.MAX_STATEMENT_CHARS, 'Statement text exceeds budget'),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Unknown']).optional(),
  isContest: z.boolean().default(false),
  detectedAt: z.number().int().positive(),
  contentType: ContentTypeSchema.optional(),
  sections: z
    .array(PageSectionSchema)
    .max(LIMITS.MAX_SECTIONS_COUNT, 'Sections count exceeds budget')
    .refine(
      (secs) => !secs || secs.reduce((acc, s) => acc + s.text.length, 0) <= LIMITS.MAX_TOTAL_SECTIONS_CHARS,
      'Total sections text exceeds cumulative budget'
    )
    .optional(),
  selectedText: z.string().optional(),
  isSensitive: z.boolean().optional(),
  sensitiveReason: z.string().optional(),
  isSparse: z.boolean().optional(),
  language: z.string().optional(),
  statementLength: z.number().optional(),
  adapterName: z.string().optional(),
  isTruncated: z.boolean().optional(),
});

export type SiteType = z.infer<typeof SiteTypeSchema>;
export type PageContext = z.infer<typeof PageContextSchema>;
