import type { DetectorConfig, DetectorWeights } from './types';

export const DEFAULT_DETECTOR_WEIGHTS: DetectorWeights = {
  bias: -1.8,
  weightWrongSubmissions: 1.85,
  weightActiveDwell: 0.55,
  weightScrollReversals: 0.35,
  weightTabSwitchRate: 0.30,
  weightTimeWithoutProgress: 2.5,
};

export const SENSITIVITY_THRESHOLDS = {
  low: 0.75,
  medium: 0.60,
  high: 0.45,
};

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  weights: DEFAULT_DETECTOR_WEIGHTS,
  thresholds: SENSITIVITY_THRESHOLDS,
  smoothingAlpha: 0.65,
  maxDwellCapWithoutCorroboration: 0.40, // EC-040 (reading carefully alone cannot trigger stuck)
  maxReversalsCapWithoutCorroboration: 0.45, // EC-047 (comparing examples alone cannot trigger stuck)
};
