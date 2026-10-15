import { z } from 'zod';
import { DEFAULT_AI_MODEL } from '../config';

export const QuietHoursSchema = z.object({
  enabled: z.boolean().default(false),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').default('22:00'),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').default('08:00'),
});

export const AllowedOriginSchema = z.object({
  origin: z.string(),
  grantedAt: z.number(),
  status: z.enum(['active', 'paused']).default('active'),
  enabledNudges: z.boolean().default(false),
});

export const SettingsSchema = z.object({
  trackingEnabled: z.boolean().default(false),
  nudgeSensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  cooldownMin: z.number().int().min(1).max(180).default(15),
  maxNudgesPerHour: z.number().int().min(1).max(20).default(4),
  quietHours: QuietHoursSchema.default({ enabled: false, start: '22:00', end: '08:00' }),
  defaultHintLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).default(1),
  enabledSites: z.array(z.string()).default(['leetcode.com', 'codeforces.com']),
  blockedSites: z.array(z.string()).default([]),
  allowedOrigins: z.array(AllowedOriginSchema).default([]),
  neverSendPageTextSites: z.array(z.string()).default([]),
  neverNudgeSites: z.array(z.string()).default([]),
  customBlacklistPatterns: z.array(z.string()).default([]),
  confirmedSendSites: z.array(z.string()).default([]),
  // Hard requirement: contestAutoDisable must ALWAYS be true and cannot be overridden (EC-100)
  contestAutoDisable: z.literal(true).default(true),
  model: z.string().min(1).default(DEFAULT_AI_MODEL),
  includeCodeConsent: z.boolean().default(false),
  demoMode: z.boolean().default(false),
  nudgeAfterMinutes: z.number().min(2).max(30).default(8),
  lowQuotaMode: z.boolean().default(true),
});

export type QuietHours = z.infer<typeof QuietHoursSchema>;
export type AllowedOrigin = z.infer<typeof AllowedOriginSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
