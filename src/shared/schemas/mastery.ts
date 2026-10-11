import { z } from 'zod';

export const TopicMasteryItemSchema = z.object({
  pKnown: z.number().min(0).max(1),
  attempts: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
  lastUpdated: z.number().optional(),
});

export const MasterySchema = z.record(z.string(), TopicMasteryItemSchema);

export const BanditBucketStatsSchema = z.object({
  accept: z.number().min(0),
  dismiss: z.number().min(0),
  ignore: z.number().min(0),
  n: z.number().min(0),
});

export const BanditStatsSchema = z.record(z.string(), BanditBucketStatsSchema);

export const WeakTopicRecommendationSchema = z.object({
  topic: z.string(),
  pKnown: z.number().min(0).max(1),
  attempts: z.number().int(),
  hintsUsed: z.number().int(),
  recommendedProblems: z.array(
    z.object({
      title: z.string(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']),
      url: z.string(),
    })
  ),
  studyTip: z.string(),
});

export type TopicMasteryItem = z.infer<typeof TopicMasteryItemSchema>;
export type Mastery = z.infer<typeof MasterySchema>;
export type BanditBucketStats = z.infer<typeof BanditBucketStatsSchema>;
export type BanditStats = z.infer<typeof BanditStatsSchema>;
export type WeakTopicRecommendation = z.infer<typeof WeakTopicRecommendationSchema>;

