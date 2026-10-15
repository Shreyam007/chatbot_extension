import type { SignalWindow, StuckEstimate, StuckState } from '../../shared/schemas/signals';

export type SensitivityLevel = 'low' | 'medium' | 'high';

export interface DetectorWeights {
  bias: number;
  weightWrongSubmissions: number;
  weightActiveDwell: number;
  weightScrollReversals: number;
  weightTabSwitchRate: number;
  weightTimeWithoutProgress: number;
}

export interface DetectorThresholds {
  stuckThreshold: number;
  distractedTabRateThreshold: number;
  distractedActiveRatioThreshold: number;
}

export interface DetectorConfig {
  weights: DetectorWeights;
  thresholds: Record<SensitivityLevel, number>;
  smoothingAlpha: number; // e.g. 0.65
  maxDwellCapWithoutCorroboration: number; // EC-040 cap (0.40)
  maxReversalsCapWithoutCorroboration: number; // EC-047 cap (0.45)
}

export interface NormalizedFeatures {
  activeDwellMinutes: number;
  wrongSubmissions: number;
  scrollReversals: number;
  tabSwitchRate: number; // switches per minute
  idleRatio: number;
}

export interface FeatureContributions {
  dwell: number;
  wrongSubmissions: number;
  scrollReversals: number;
  tabSwitches: number;
  timeWithoutProgress?: number;
}

export interface DetectorOptions {
  sensitivity?: SensitivityLevel;
  previousP?: number;
  config?: Partial<DetectorConfig>;
  contentType?: 'problem' | 'article' | 'documentation' | 'general';
  isProblemPage?: boolean;
  nudgeAfterMinutes?: number;
  demoMode?: boolean;
  timeWithoutProgressMinutes?: number;
}

export type { SignalWindow, StuckEstimate, StuckState };
