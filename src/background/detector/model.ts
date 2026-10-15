import type { SignalWindow, StuckEstimate, StuckState } from '../../shared/schemas/signals';
import type { DetectorOptions, DetectorConfig, NormalizedFeatures } from './types';
import { DEFAULT_DETECTOR_CONFIG } from './weights';

/**
 * Sanitizes and normalizes raw behavioural signal window into safe bounded numbers (EC-044).
 */
export function extractNormalizedFeatures(signals: SignalWindow): NormalizedFeatures {
  const sanitize = (val: unknown, fallback = 0): number => {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      return fallback;
    }
    return Math.max(0, val);
  };

  const dwellMs = sanitize(signals.dwellMs);
  const activeMs = sanitize(signals.activeMs, dwellMs);
  const idleMs = sanitize(signals.idleMs);
  const scrollReversals = sanitize(signals.scrollReversals);
  const tabSwitches = sanitize(signals.tabSwitches);
  const wrongSubmissions = sanitize(signals.wrongSubmissions);

  const windowSpanMs = Math.max(
    1000,
    sanitize(signals.windowEnd) - sanitize(signals.windowStart),
    activeMs + idleMs,
    dwellMs
  );
  const windowDurationMinutes = windowSpanMs / 60_000;

  // Active coding dwell in minutes, capped at 30 minutes
  const activeDwellMinutes = Math.min(30, activeMs / 60_000);

  // Tab switch rate per minute (capped at 30 switches/min)
  const tabSwitchRate = Math.min(30, tabSwitches / Math.max(0.5, windowDurationMinutes));

  // Ratio of idle time to total duration
  const totalTrackedMs = activeMs + idleMs;
  const idleRatio = totalTrackedMs > 0 ? Math.min(1, idleMs / totalTrackedMs) : 0;

  return {
    activeDwellMinutes,
    wrongSubmissions: Math.min(20, wrongSubmissions),
    scrollReversals: Math.min(50, scrollReversals),
    tabSwitchRate,
    idleRatio,
  };
}

/**
 * Pure deterministic inference function:
 * features -> p(stuck) with logistic model, guardrails, and explainable contributions.
 */
export function estimateStuckState(
  signals: SignalWindow,
  options: DetectorOptions = {}
): StuckEstimate {
  const config: DetectorConfig = {
    ...DEFAULT_DETECTOR_CONFIG,
    ...options.config,
    weights: {
      ...DEFAULT_DETECTOR_CONFIG.weights,
      ...options.config?.weights,
    },
    thresholds: {
      ...DEFAULT_DETECTOR_CONFIG.thresholds,
      ...options.config?.thresholds,
    },
  };

  const sensitivity = options.sensitivity || 'medium';
  const threshold = config.thresholds[sensitivity] ?? config.thresholds.medium;

  // 1. Sanitize & extract normalized features (EC-044)
  const features = extractNormalizedFeatures(signals);

  // 2. Determine if on a problem page (LeetCode, Codeforces, HackerRank) vs generic/article
  const isProblemPage = options.isProblemPage ?? (options.contentType === undefined || options.contentType === 'problem');

  // 3. Compute effective N (nudge after N minutes of active time without progress)
  const baseN = options.nudgeAfterMinutes ?? 8.0;
  let effectiveN = baseN;
  if (options.demoMode) {
    // Demo mode: 20s active dwell
    effectiveN = 20 / 60;
  } else {
    // Sensitivity scales N: high = 0.6x, medium = 1.0x, low = 1.5x
    if (sensitivity === 'high') {
      effectiveN = baseN * 0.6;
    } else if (sensitivity === 'low') {
      effectiveN = baseN * 1.5;
    } else {
      effectiveN = baseN * 1.0;
    }
  }

  // Time without progress in minutes (observable active dwell since problem start or last progress)
  const timeWithoutProgressMinutes = options.timeWithoutProgressMinutes ?? features.activeDwellMinutes;
  const isTimeProgressActive = isProblemPage && timeWithoutProgressMinutes >= effectiveN;

  // 4. Non-linear feature transformations
  // - Wrong submissions: logarithmic sub-linear scaling ln(1 + W)
  const phiWrong = Math.log(1 + features.wrongSubmissions);
  // - Active dwell: saturating tanh function tanh(D / 10)
  const phiDwell = Math.tanh(features.activeDwellMinutes / 10);
  // - Scroll reversals: capped linear scaling
  const phiReversals = Math.min(features.scrollReversals, 10) / 5;
  // - Tab switch rate: capped linear scaling
  const phiTabRate = Math.min(features.tabSwitchRate, 6) / 3;
  // - Time without progress ramp (only on problem pages after effectiveN)
  let phiTime = 0;
  if (isTimeProgressActive) {
    const deltaT = timeWithoutProgressMinutes - effectiveN;
    const scaleFactor = options.demoMode ? 0.035 : Math.max(0.08, effectiveN * 0.25);
    phiTime = Math.tanh(deltaT / scaleFactor);
  }

  // 5. Compute logistic logit
  const w = config.weights;
  const logit =
    w.bias +
    w.weightWrongSubmissions * phiWrong +
    w.weightActiveDwell * phiDwell +
    w.weightScrollReversals * phiReversals +
    w.weightTabSwitchRate * phiTabRate +
    w.weightTimeWithoutProgress * phiTime;

  // 6. Logistic sigmoid function
  let pRaw = 1 / (1 + Math.exp(-logit));
  pRaw = Math.min(1, Math.max(0, pRaw));

  // 7. Hard guardrails & corroboration checks
  // On problem pages where time-without-progress >= N, the flat 0.40 and 0.45 caps are replaced by the ramp.
  // For article, documentation, general pages, and short problem sessions (< N min), retain EC-040 reading-carefully cap.
  if (!isTimeProgressActive) {
    // EC-040: User reading carefully (dwell alone without corroborating wrong submissions or scroll reversals)
    if (features.wrongSubmissions === 0 && features.scrollReversals <= 1) {
      pRaw = Math.min(pRaw, config.maxDwellCapWithoutCorroboration);
    }

    // EC-047: Comparing examples (scroll reversals alone without wrong submissions or prolonged dwell)
    if (features.wrongSubmissions === 0 && features.activeDwellMinutes < 3.0) {
      pRaw = Math.min(pRaw, config.maxReversalsCapWithoutCorroboration);
    }
  }

  // 8. Exponential smoothing
  let p = pRaw;
  if (options.previousP !== undefined && !isNaN(options.previousP) && isFinite(options.previousP)) {
    const prev = Math.min(1, Math.max(0, options.previousP));
    const alpha = config.smoothingAlpha;
    p = alpha * pRaw + (1 - alpha) * prev;
  }
  p = Math.round(p * 10000) / 10000;

  // 9. Check for distracted branch
  // High tab switching frequency combined with low coding dwell or high idle ratio
  const isDistracted =
    features.tabSwitchRate >= 4.0 &&
    (features.activeDwellMinutes < 0.75 || features.idleRatio > 0.6);

  // 10. Classify state
  let state: StuckState = 'flowing';
  if (isDistracted) {
    state = 'distracted';
  } else if (p >= threshold) {
    state = 'stuck';
  } else {
    state = 'flowing';
  }

  // 11. Nudge copy determination
  // Softer copy for time-only triggers on problem pages without wrong submissions
  const isTimeOnlyTrigger = isTimeProgressActive && features.wrongSubmissions === 0;
  const nudgeText = isTimeOnlyTrigger
    ? "You've been on this one a while. Want a hint?"
    : "Looks like this problem is tricky. Want a nudge?";

  // 12. Explainable feature contributions (for S07 Trace & Diagnostics)
  const cDwell = Math.max(0, w.weightActiveDwell * phiDwell);
  const cWrong = Math.max(0, w.weightWrongSubmissions * phiWrong);
  const cReversals = Math.max(0, w.weightScrollReversals * phiReversals);
  const cTabs = Math.max(0, w.weightTabSwitchRate * phiTabRate);
  const cTime = Math.max(0, w.weightTimeWithoutProgress * phiTime);
  const sum = cDwell + cWrong + cReversals + cTabs + cTime;

  const contributions: Record<string, number> = {
    dwell: sum > 0 ? Math.round((cDwell / sum) * 100) / 100 : 0,
    wrongSubmissions: sum > 0 ? Math.round((cWrong / sum) * 100) / 100 : 0,
    scrollReversals: sum > 0 ? Math.round((cReversals / sum) * 100) / 100 : 0,
    tabSwitches: sum > 0 ? Math.round((cTabs / sum) * 100) / 100 : 0,
    timeWithoutProgress: sum > 0 ? Math.round((cTime / sum) * 100) / 100 : 0,
  };

  return {
    p,
    state,
    contributions,
    nudgeText,
    isTimeOnlyTrigger,
  };
}
