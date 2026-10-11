import { describe, it, expect } from 'vitest';
import {
  calculateBktUpdate,
  calculateHintAttenuation,
  applyTemporalDecay,
  recommendStartingHintLevel,
  identifyWeakTopics,
} from '../../src/background/mastery/bkt';
import { BKT_CONFIG } from '../../src/shared/config';
import type { TopicMasteryItem } from '../../src/shared/schemas/mastery';

describe('BKT-lite Mastery Engine (Step 13)', () => {
  describe('Hint Attenuation Scaling', () => {
    it('scales credit monotonically from independent solve (1.0) down to heavy scaffold (0.10)', () => {
      const c0 = calculateHintAttenuation(0);
      const c1 = calculateHintAttenuation(1);
      const c2 = calculateHintAttenuation(2);
      const c3 = calculateHintAttenuation(3);
      const c4 = calculateHintAttenuation(4);
      const c10 = calculateHintAttenuation(10);

      expect(c0).toBe(1.0);
      expect(c1).toBe(0.75);
      expect(c2).toBe(0.5);
      expect(c3).toBe(0.25);
      expect(c4).toBe(0.1);
      expect(c10).toBe(0.1);

      expect(c0).toBeGreaterThan(c1);
      expect(c1).toBeGreaterThan(c2);
      expect(c2).toBeGreaterThan(c3);
      expect(c3).toBeGreaterThan(c4);
    });

    it('handles negative or absurd hint counts safely', () => {
      expect(calculateHintAttenuation(-5)).toBe(1.0);
      expect(calculateHintAttenuation(1000)).toBe(0.1);
    });
  });

  describe('BKT-lite Update Rules', () => {
    it('initializes from BKT_CONFIG.PRIOR_P_KNOWN when prior is undefined', () => {
      const updated = calculateBktUpdate(undefined, 0);
      expect(updated).toBeGreaterThan(BKT_CONFIG.PRIOR_P_KNOWN);
      expect(updated).toBeLessThan(1.0);
    });

    it('ensures more hints used yields strictly smaller mastery gains', () => {
      const prior = 0.40;
      const gain0 = calculateBktUpdate(prior, 0);
      const gain1 = calculateBktUpdate(prior, 1);
      const gain2 = calculateBktUpdate(prior, 2);
      const gain3 = calculateBktUpdate(prior, 3);
      const gain5 = calculateBktUpdate(prior, 5);

      expect(gain0).toBeGreaterThan(gain1);
      expect(gain1).toBeGreaterThan(gain2);
      expect(gain2).toBeGreaterThan(gain3);
      expect(gain3).toBeGreaterThan(gain5);
    });

    it('converges towards mastery over repeated successful solves with 0 hints', () => {
      let p = BKT_CONFIG.PRIOR_P_KNOWN;
      for (let i = 0; i < 8; i++) {
        p = calculateBktUpdate(p, 0);
      }
      expect(p).toBeGreaterThanOrEqual(BKT_CONFIG.MASTERY_THRESHOLD);
      expect(p).toBeLessThanOrEqual(0.98);
    });

    it('strictly clamps outputs within [0.02, 0.98] under extreme edge cases', () => {
      expect(calculateBktUpdate(0.0, 10)).toBeGreaterThanOrEqual(0.02);
      expect(calculateBktUpdate(1.0, 0)).toBeLessThanOrEqual(0.98);
      expect(calculateBktUpdate(NaN, 0)).toBeGreaterThanOrEqual(0.02);
      expect(calculateBktUpdate(Infinity, 0)).toBeLessThanOrEqual(0.98);
    });
  });

  describe('Temporal Memory Decay', () => {
    it('does not decay if elapsed time is under an hour or in the future', () => {
      const now = 1700000000000;
      const recent = now - 1000 * 60 * 30; // 30 minutes ago
      expect(applyTemporalDecay(0.80, recent, now)).toBe(0.80);
      expect(applyTemporalDecay(0.80, now + 10000, now)).toBe(0.80);
      expect(applyTemporalDecay(0.80, undefined, now)).toBe(0.80);
    });

    it('decays mastery towards the prior over days following half-life curve', () => {
      const now = 1700000000000;
      const halfLifeMs = BKT_CONFIG.TIME_DECAY_HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;
      const thirtyDaysAgo = now - halfLifeMs;

      const initial = 0.80;
      const decayed = applyTemporalDecay(initial, thirtyDaysAgo, now);

      // At half-life (30 days), distance from prior (0.30) should be halved:
      // (0.80 - 0.30) / 2 = 0.25 -> expected ~ 0.55
      expect(decayed).toBeLessThan(initial);
      expect(decayed).toBeGreaterThan(BKT_CONFIG.PRIOR_P_KNOWN);
      expect(Math.abs(decayed - 0.55)).toBeLessThan(0.03);
    });

    it('asymptotically approaches prior knowledge baseline after very long intervals', () => {
      const now = 1700000000000;
      const twoYearsAgo = now - 730 * 24 * 60 * 60 * 1000;
      const decayed = applyTemporalDecay(0.95, twoYearsAgo, now);

      expect(Math.abs(decayed - BKT_CONFIG.PRIOR_P_KNOWN)).toBeLessThan(0.01);
    });
  });

  describe('Starting Hint Level Recommendation', () => {
    it('recommends Level 1 (Socratic Direction) for high mastery (>= 0.75)', () => {
      expect(recommendStartingHintLevel(0.75)).toBe(1);
      expect(recommendStartingHintLevel(0.90)).toBe(1);
    });

    it('recommends Level 2 (Invariant Check) for medium mastery (0.45 .. 0.74)', () => {
      expect(recommendStartingHintLevel(0.45)).toBe(2);
      expect(recommendStartingHintLevel(0.60)).toBe(2);
      expect(recommendStartingHintLevel(0.74)).toBe(2);
    });

    it('recommends Level 3 (Pseudocode Outline) for low mastery (< 0.45)', () => {
      expect(recommendStartingHintLevel(0.44)).toBe(3);
      expect(recommendStartingHintLevel(0.20)).toBe(3);
      expect(recommendStartingHintLevel(0.05)).toBe(3);
    });

    it('defaults to Level 1 when mastery is unknown or NaN', () => {
      expect(recommendStartingHintLevel(undefined)).toBe(1);
      expect(recommendStartingHintLevel(NaN)).toBe(1);
    });
  });

  describe('Weak Topics Identification', () => {
    it('correctly filters topics below 0.60, sorts weakest first, and attaches practice problems', () => {
      const now = 1700000000000;
      const mockMastery: Record<string, TopicMasteryItem> = {
        'Arrays & Hashing': { pKnown: 0.85, attempts: 10, hintsUsed: 2, lastUpdated: now },
        'Two Pointers': { pKnown: 0.65, attempts: 6, hintsUsed: 2, lastUpdated: now },
        'Dynamic Programming': { pKnown: 0.38, attempts: 5, hintsUsed: 7, lastUpdated: now },
        'Binary Search': { pKnown: 0.52, attempts: 4, hintsUsed: 4, lastUpdated: now },
      };

      const weakList = identifyWeakTopics(mockMastery, now);

      expect(weakList).toHaveLength(2);
      // Weakest first
      expect(weakList[0]!.topic).toBe('Dynamic Programming');
      expect(weakList[0]!.pKnown).toBe(0.38);
      expect(weakList[0]!.recommendedProblems.length).toBeGreaterThan(0);
      expect(weakList[0]!.studyTip).toContain('state transitions');

      expect(weakList[1]!.topic).toBe('Binary Search');
      expect(weakList[1]!.pKnown).toBe(0.52);
    });

    it('returns empty list when all topics exceed the weak threshold', () => {
      const now = 1700000000000;
      const mockMastery: Record<string, TopicMasteryItem> = {
        'Arrays & Hashing': { pKnown: 0.88, attempts: 12, hintsUsed: 1, lastUpdated: now },
        'Two Pointers': { pKnown: 0.75, attempts: 8, hintsUsed: 2, lastUpdated: now },
      };

      const weakList = identifyWeakTopics(mockMastery, now);
      expect(weakList).toHaveLength(0);
    });
  });
});
