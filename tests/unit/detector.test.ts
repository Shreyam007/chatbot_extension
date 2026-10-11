import { describe, it, expect } from 'vitest';
import { estimateStuckState } from '../../src/background/detector';
import { StuckEstimateSchema, type SignalWindow } from '../../src/shared/schemas/signals';

function createMockSignals(overrides: Partial<SignalWindow> = {}): SignalWindow {
  const now = Date.now();
  return {
    dwellMs: 120_000,
    activeMs: 120_000,
    idleMs: 0,
    scrollReversals: 0,
    tabSwitches: 0,
    wrongSubmissions: 0,
    windowStart: now - 120_000,
    windowEnd: now,
    ...overrides,
  };
}

describe('Detector: Stuck Probability Model (Step 6)', () => {
  // Scenario 1
  it('Scenario 1: Fresh problem start (zero data) produces low p and flowing state', () => {
    const signals = createMockSignals({
      dwellMs: 0,
      activeMs: 0,
      idleMs: 0,
      scrollReversals: 0,
      tabSwitches: 0,
      wrongSubmissions: 0,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('flowing');
    expect(estimate.p).toBeLessThan(0.20);
    expect(StuckEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  // Scenario 2
  it('Scenario 2: Normal active coding for 2 minutes remains in flowing state', () => {
    const signals = createMockSignals({
      dwellMs: 120_000,
      activeMs: 120_000,
      wrongSubmissions: 0,
      scrollReversals: 1,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('flowing');
    expect(estimate.p).toBeLessThan(0.30);
  });

  // Scenario 3
  it('Scenario 3: Flowing state with minor scrolling remains flowing', () => {
    const signals = createMockSignals({
      dwellMs: 180_000,
      activeMs: 180_000,
      scrollReversals: 2,
      tabSwitches: 1,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('flowing');
    expect(estimate.p).toBeLessThan(0.40);
  });

  // Scenario 4
  it('Scenario 4: Single wrong submission early in session increases p but remains below threshold', () => {
    const signals = createMockSignals({
      dwellMs: 90_000,
      activeMs: 90_000,
      wrongSubmissions: 1,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('flowing');
    expect(estimate.p).toBeGreaterThan(0.20);
    expect(estimate.p).toBeLessThan(0.55);
  });

  // Scenario 5
  it('Scenario 5: High dwell (8 min) + 3 wrong submissions triggers stuck state', () => {
    const signals = createMockSignals({
      dwellMs: 480_000,
      activeMs: 480_000,
      wrongSubmissions: 3,
      scrollReversals: 2,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('stuck');
    expect(estimate.p).toBeGreaterThanOrEqual(0.60);
  });

  // Scenario 6
  it('Scenario 6: High dwell + 4 wrong submissions + 5 scroll reversals triggers strong stuck', () => {
    const signals = createMockSignals({
      dwellMs: 600_000,
      activeMs: 600_000,
      wrongSubmissions: 4,
      scrollReversals: 5,
      tabSwitches: 3,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('stuck');
    expect(estimate.p).toBeGreaterThan(0.80);
  });

  // Scenario 7
  it('Scenario 7: Moderate dwell (5 min) with 2 wrong submissions reaches stuck threshold', () => {
    const signals = createMockSignals({
      dwellMs: 300_000,
      activeMs: 300_000,
      wrongSubmissions: 2,
      scrollReversals: 3,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('stuck');
    expect(estimate.p).toBeGreaterThanOrEqual(0.60);
  });

  // Scenario 8
  it('Scenario 8: Severe stuck (15 min dwell + 5 wrong submissions + 8 reversals) approaches high confidence', () => {
    const signals = createMockSignals({
      dwellMs: 900_000,
      activeMs: 900_000,
      wrongSubmissions: 5,
      scrollReversals: 8,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('stuck');
    expect(estimate.p).toBeGreaterThan(0.85);
  });

  // Scenario 9
  it('Scenario 9: Monotonicity - 1 vs 2 wrong submissions strictly never lowers p', () => {
    const base = createMockSignals({ dwellMs: 240_000, activeMs: 240_000 });
    const est1 = estimateStuckState({ ...base, wrongSubmissions: 1 });
    const est2 = estimateStuckState({ ...base, wrongSubmissions: 2 });

    expect(est2.p).toBeGreaterThan(est1.p);
  });

  // Scenario 10
  it('Scenario 10: Monotonicity - 2 vs 3 wrong submissions strictly never lowers p', () => {
    const base = createMockSignals({ dwellMs: 300_000, activeMs: 300_000, scrollReversals: 2 });
    const est2 = estimateStuckState({ ...base, wrongSubmissions: 2 });
    const est3 = estimateStuckState({ ...base, wrongSubmissions: 3 });

    expect(est3.p).toBeGreaterThan(est2.p);
  });

  // Scenario 11
  it('Scenario 11: Monotonicity - sequence from 0 to 6 submissions is strictly non-decreasing', () => {
    const base = createMockSignals({ dwellMs: 300_000, activeMs: 300_000 });
    let lastP = 0;

    for (let w = 0; w <= 6; w++) {
      const estimate = estimateStuckState({ ...base, wrongSubmissions: w });
      expect(estimate.p).toBeGreaterThanOrEqual(lastP);
      lastP = estimate.p;
    }
  });

  // Scenario 12
  it('Scenario 12: Monotonicity - increasing active dwell never lowers p (holding others equal)', () => {
    const base = createMockSignals({ wrongSubmissions: 2, scrollReversals: 2 });
    const est5m = estimateStuckState({ ...base, dwellMs: 300_000, activeMs: 300_000 });
    const est10m = estimateStuckState({ ...base, dwellMs: 600_000, activeMs: 600_000 });

    expect(est10m.p).toBeGreaterThanOrEqual(est5m.p);
  });

  // Scenario 13
  it('Scenario 13: EC-040 Reading carefully - 15 min dwell with 0 wrong submissions capped at 0.40', () => {
    const signals = createMockSignals({
      dwellMs: 900_000,
      activeMs: 900_000,
      wrongSubmissions: 0,
      scrollReversals: 0,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.p).toBeLessThanOrEqual(0.40);
    expect(estimate.state).toBe('flowing');
  });

  // Scenario 14
  it('Scenario 14: EC-040 Reading carefully - 30 min dwell with 0 wrong submissions capped at 0.40', () => {
    const signals = createMockSignals({
      dwellMs: 1_800_000,
      activeMs: 1_800_000,
      wrongSubmissions: 0,
      scrollReversals: 1,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.p).toBeLessThanOrEqual(0.40);
    expect(estimate.state).toBe('flowing');
  });

  // Scenario 15
  it('Scenario 15: EC-047 Comparing examples - high scroll reversals alone on short dwell capped at 0.45', () => {
    const signals = createMockSignals({
      dwellMs: 60_000,
      activeMs: 60_000,
      scrollReversals: 12,
      wrongSubmissions: 0,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.p).toBeLessThanOrEqual(0.45);
    expect(estimate.state).toBe('flowing');
  });

  // Scenario 16
  it('Scenario 16: EC-047 Comparing examples - 20 scroll reversals on 2 min dwell cannot trigger stuck', () => {
    const signals = createMockSignals({
      dwellMs: 120_000,
      activeMs: 120_000,
      scrollReversals: 20,
      wrongSubmissions: 0,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.p).toBeLessThanOrEqual(0.45);
    expect(estimate.state).toBe('flowing');
  });

  // Scenario 17
  it('Scenario 17: EC-044 NaN protection - NaN inputs never yield NaN or crash', () => {
    const signals = createMockSignals({
      dwellMs: NaN,
      activeMs: NaN,
      wrongSubmissions: NaN as unknown as number,
      scrollReversals: NaN as unknown as number,
    });
    const estimate = estimateStuckState(signals);

    expect(isNaN(estimate.p)).toBe(false);
    expect(estimate.p).toBeGreaterThanOrEqual(0);
    expect(estimate.p).toBeLessThanOrEqual(1);
    expect(StuckEstimateSchema.safeParse(estimate).success).toBe(true);
  });

  // Scenario 18
  it('Scenario 18: EC-044 Negative numbers are clamped to 0 gracefully', () => {
    const signals = createMockSignals({
      dwellMs: -5000,
      activeMs: -5000,
      wrongSubmissions: -2,
      scrollReversals: -10,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.p).toBeGreaterThanOrEqual(0);
    expect(estimate.p).toBeLessThanOrEqual(1);
    expect(estimate.state).toBe('flowing');
  });

  // Scenario 19
  it('Scenario 19: EC-044 Absurd huge values are safely clamped within bounds', () => {
    const signals = createMockSignals({
      dwellMs: 10_000_000_000,
      activeMs: 10_000_000_000,
      wrongSubmissions: 9999,
      scrollReversals: 8888,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.p).toBeLessThanOrEqual(1.0);
    expect(estimate.p).toBeGreaterThanOrEqual(0.0);
    expect(estimate.state).toBe('stuck');
  });

  // Scenario 20
  it('Scenario 20: EC-044 Infinity values are sanitized cleanly', () => {
    const signals = createMockSignals({
      tabSwitches: Infinity as unknown as number,
      dwellMs: Infinity as unknown as number,
    });
    const estimate = estimateStuckState(signals);

    expect(isNaN(estimate.p)).toBe(false);
    expect(isFinite(estimate.p)).toBe(true);
  });

  // Scenario 21
  it('Scenario 21: Distracted classification - rapid tab switches with negligible coding dwell', () => {
    const now = Date.now();
    const signals: SignalWindow = {
      dwellMs: 60_000,
      activeMs: 15_000,
      idleMs: 45_000,
      scrollReversals: 0,
      tabSwitches: 8, // 8 switches in 1 min
      wrongSubmissions: 0,
      windowStart: now - 60_000,
      windowEnd: now,
    };
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('distracted');
  });

  // Scenario 22
  it('Scenario 22: Distracted classification - high tab switches and high idle ratio', () => {
    const now = Date.now();
    const signals: SignalWindow = {
      dwellMs: 120_000,
      activeMs: 20_000,
      idleMs: 100_000,
      scrollReversals: 0,
      tabSwitches: 12,
      wrongSubmissions: 0,
      windowStart: now - 120_000,
      windowEnd: now,
    };
    const estimate = estimateStuckState(signals);

    expect(estimate.state).toBe('distracted');
  });

  // Scenario 23
  it('Scenario 23: High tab switching with significant active coding is not marked distracted', () => {
    const now = Date.now();
    const signals: SignalWindow = {
      dwellMs: 300_000,
      activeMs: 280_000, // 4.6 min active coding
      idleMs: 20_000,
      scrollReversals: 1,
      tabSwitches: 8,
      wrongSubmissions: 0,
      windowStart: now - 300_000,
      windowEnd: now,
    };
    const estimate = estimateStuckState(signals);

    expect(estimate.state).not.toBe('distracted');
  });

  // Scenario 24
  it('Scenario 24: Sensitivity tuning - low sensitivity threshold (0.75) requires stronger evidence', () => {
    const signals = createMockSignals({
      dwellMs: 300_000,
      activeMs: 300_000,
      wrongSubmissions: 2,
      scrollReversals: 2,
    });
    const estMedium = estimateStuckState(signals, { sensitivity: 'medium' });
    const estLow = estimateStuckState(signals, { sensitivity: 'low' });

    expect(estMedium.p).toBe(estLow.p); // same probability
    expect(estMedium.state).toBe('stuck'); // 0.60 threshold met
    expect(estLow.state).toBe('flowing'); // 0.75 threshold not yet met
  });

  // Scenario 25
  it('Scenario 25: Sensitivity tuning - high sensitivity threshold (0.45) triggers earlier', () => {
    const signals = createMockSignals({
      dwellMs: 180_000,
      activeMs: 180_000,
      wrongSubmissions: 1,
      scrollReversals: 3,
    });
    const estMedium = estimateStuckState(signals, { sensitivity: 'medium' });
    const estHigh = estimateStuckState(signals, { sensitivity: 'high' });

    expect(estMedium.state).toBe('flowing');
    expect(estHigh.state).toBe('stuck'); // triggers at 0.45
  });

  // Scenario 26
  it('Scenario 26: Exponential smoothing prevents single sudden spikes from premature trigger', () => {
    const suddenSpikeSignals = createMockSignals({
      dwellMs: 360_000,
      activeMs: 360_000,
      wrongSubmissions: 2,
      scrollReversals: 3,
    });

    const rawEst = estimateStuckState(suddenSpikeSignals);
    // Smooth against previous low probability of 0.10
    const smoothedEst = estimateStuckState(suddenSpikeSignals, { previousP: 0.10 });

    expect(smoothedEst.p).toBeLessThan(rawEst.p);
  });

  // Scenario 27
  it('Scenario 27: Exponential smoothing maintains stability during brief dips', () => {
    const dipSignals = createMockSignals({
      dwellMs: 120_000,
      activeMs: 120_000,
      wrongSubmissions: 1,
    });

    const rawEst = estimateStuckState(dipSignals);
    // Smooth against previous high probability of 0.85
    const smoothedEst = estimateStuckState(dipSignals, { previousP: 0.85 });

    expect(smoothedEst.p).toBeGreaterThan(rawEst.p);
  });

  // Scenario 28
  it('Scenario 28: Trace explainability contributions sum to 1.0 (100%)', () => {
    const signals = createMockSignals({
      dwellMs: 400_000,
      activeMs: 400_000,
      wrongSubmissions: 3,
      scrollReversals: 4,
      tabSwitches: 2,
    });
    const estimate = estimateStuckState(signals);

    const sum = Object.values(estimate.contributions).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(0.98);
    expect(sum).toBeLessThanOrEqual(1.02);
  });

  // Scenario 29
  it('Scenario 29: Trace explainability attributes dominant cause to wrong submissions when failed runs occur', () => {
    const signals = createMockSignals({
      dwellMs: 300_000,
      activeMs: 300_000,
      wrongSubmissions: 4,
      scrollReversals: 1,
    });
    const estimate = estimateStuckState(signals);

    expect(estimate.contributions.wrongSubmissions ?? 0).toBeGreaterThan(estimate.contributions.dwell ?? 0);
    expect(estimate.contributions.wrongSubmissions ?? 0).toBeGreaterThan(estimate.contributions.scrollReversals ?? 0);
  });

  // Scenario 30
  it('Scenario 30: Pure deterministic guarantee - identical inputs produce identical estimates', () => {
    const signals = createMockSignals({
      dwellMs: 360_000,
      activeMs: 360_000,
      wrongSubmissions: 2,
      scrollReversals: 3,
    });

    const first = estimateStuckState(signals);
    for (let i = 0; i < 50; i++) {
      const current = estimateStuckState(signals);
      expect(current.p).toBe(first.p);
      expect(current.state).toBe(first.state);
      expect(current.contributions).toEqual(first.contributions);
    }
  });
});
