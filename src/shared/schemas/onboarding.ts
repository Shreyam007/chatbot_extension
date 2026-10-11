import { z } from 'zod';
import { DEFAULT_AI_MODEL } from '../config';

export const OnboardingStateSchema = z.object({
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  completed: z.boolean().default(false),
  trackingEnabled: z.boolean().default(false),
  apiKey: z.string().default(''),
  enabledSites: z.array(z.string()).default(['leetcode.com', 'codeforces.com']),
  testStatus: z.enum(['idle', 'testing', 'success', 'error']).default('idle'),
  lastTestedAt: z.number().optional(),
  detectedLatencyMs: z.number().optional(),
  activeModel: z.string().default(DEFAULT_AI_MODEL)
});

export type OnboardingState = z.infer<typeof OnboardingStateSchema>;

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  currentStep: 1,
  completed: false,
  trackingEnabled: false,
  apiKey: '',
  enabledSites: ['leetcode.com', 'codeforces.com'],
  testStatus: 'idle',
  activeModel: DEFAULT_AI_MODEL
};
