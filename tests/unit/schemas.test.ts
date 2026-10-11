import { describe, it, expect } from 'vitest';
import {
  SettingsSchema,
  PageContextSchema,
  SignalWindowSchema,
  StuckEstimateSchema,
  HintSchema,
  MasterySchema,
  BanditStatsSchema,
  EventLogEntrySchema,
} from '../../src/shared/schemas';

describe('Step 2: Zod Data Model Schemas', () => {
  describe('SettingsSchema', () => {
    it('applies defaults correctly', () => {
      const parsed = SettingsSchema.parse({});
      expect(parsed.trackingEnabled).toBe(false);
      expect(parsed.nudgeSensitivity).toBe('medium');
      expect(parsed.cooldownMin).toBe(15);
      expect(parsed.maxNudgesPerHour).toBe(4);
      expect(parsed.defaultHintLevel).toBe(1);
      expect(parsed.contestAutoDisable).toBe(true);
      expect(parsed.model).toBe('gemini-2.5-flash');
    });

    it('rejects attempt to disable contestAutoDisable (EC-100)', () => {
      expect(() => {
        SettingsSchema.parse({ contestAutoDisable: false });
      }).toThrow();
    });

    it('rejects invalid cooldown values outside bounds', () => {
      expect(() => SettingsSchema.parse({ cooldownMin: 0 })).toThrow();
      expect(() => SettingsSchema.parse({ cooldownMin: 300 })).toThrow();
    });

    it('validates quietHours time formats strictly', () => {
      expect(SettingsSchema.parse({ quietHours: { enabled: true, start: '23:30', end: '07:00' } })).toBeDefined();
      expect(() => SettingsSchema.parse({ quietHours: { enabled: true, start: '25:00', end: '07:00' } })).toThrow();
      expect(() => SettingsSchema.parse({ quietHours: { enabled: true, start: 'invalid', end: '07:00' } })).toThrow();
    });
  });

  describe('PageContextSchema', () => {
    it('validates valid problem context', () => {
      const valid = {
        url: 'hash-abc-123',
        site: 'leetcode' as const,
        title: 'Two Sum',
        statementText: 'Given an array of integers...',
        tags: ['Array', 'Hash Table'],
        difficulty: 'Easy' as const,
        isContest: false,
        detectedAt: Date.now(),
      };
      const parsed = PageContextSchema.parse(valid);
      expect(parsed.title).toBe('Two Sum');
    });

    it('rejects missing or empty title and url', () => {
      expect(() => PageContextSchema.parse({ url: '', site: 'leetcode', title: '', statementText: 'a', detectedAt: 1 })).toThrow();
    });

    it('rejects statement text exceeding budget cap', () => {
      const oversizedText = 'a'.repeat(20000);
      expect(() =>
        PageContextSchema.parse({
          url: 'hash',
          site: 'generic',
          title: 'Big',
          statementText: oversizedText,
          detectedAt: 1,
        })
      ).toThrow();
    });
  });

  describe('SignalWindowSchema', () => {
    it('validates positive and non-negative telemetry metrics', () => {
      const window = {
        dwellMs: 120000,
        scrollReversals: 4,
        idleMs: 5000,
        wrongSubmissions: 1,
        tabSwitches: 3,
        activeMs: 115000,
        windowStart: 1000,
        windowEnd: 121000,
      };
      expect(SignalWindowSchema.parse(window)).toBeDefined();
    });

    it('rejects inverted window timestamps (windowEnd < windowStart)', () => {
      const inverted = {
        dwellMs: 1000,
        scrollReversals: 0,
        idleMs: 0,
        wrongSubmissions: 0,
        tabSwitches: 0,
        activeMs: 1000,
        windowStart: 5000,
        windowEnd: 2000,
      };
      expect(() => SignalWindowSchema.parse(inverted)).toThrow();
    });
  });

  describe('StuckEstimateSchema', () => {
    it('accepts probabilities strictly between 0 and 1', () => {
      expect(StuckEstimateSchema.parse({ p: 0.75, state: 'stuck', contributions: { dwell: 0.5 } })).toBeDefined();
      expect(StuckEstimateSchema.parse({ p: 0.0, state: 'flowing' })).toBeDefined();
      expect(StuckEstimateSchema.parse({ p: 1.0, state: 'distracted' })).toBeDefined();
    });

    it('rejects probabilities outside [0, 1] range', () => {
      expect(() => StuckEstimateSchema.parse({ p: -0.1, state: 'stuck' })).toThrow();
      expect(() => StuckEstimateSchema.parse({ p: 1.05, state: 'stuck' })).toThrow();
    });
  });

  describe('HintSchema', () => {
    it('validates levels 1 through 4', () => {
      const hint = {
        level: 2 as const,
        text: 'Consider using a hash map to look up complements in O(1) time.',
        confidence: 0.95,
        checks: { leak: false, grounded: true, relevant: true },
        retries: 0,
        model: 'gemini-2.5-flash',
        latencyMs: 1200,
      };
      expect(HintSchema.parse(hint)).toBeDefined();
    });

    it('rejects level outside 1..4 range', () => {
      const invalid = {
        level: 5 as unknown as 1,
        text: 'Some text',
        confidence: 0.5,
        checks: { leak: false, grounded: true, relevant: true },
        model: 'gemini-2.5-flash',
        latencyMs: 100,
      };
      expect(() => HintSchema.parse(invalid)).toThrow();
    });
  });

  describe('Mastery & Bandit Schemas', () => {
    it('validates BKT mastery map', () => {
      const mastery = {
        'hash-tables': { pKnown: 0.85, attempts: 10, hintsUsed: 2 },
        'dynamic-programming': { pKnown: 0.40, attempts: 5, hintsUsed: 4 },
      };
      expect(MasterySchema.parse(mastery)).toBeDefined();
    });

    it('validates bandit stats bucket records', () => {
      const bandit = {
        'leetcode:stuck:low': { accept: 5, dismiss: 2, ignore: 1, n: 8 },
      };
      expect(BanditStatsSchema.parse(bandit)).toBeDefined();
    });
  });

  describe('EventLogEntrySchema', () => {
    it('validates local exportable event entries', () => {
      const entry = {
        id: 'evt-001',
        timestamp: Date.now(),
        type: 'nudge_accepted' as const,
        contextHash: 'hash-123',
        title: 'Two Sum',
        details: { level: 1 },
      };
      expect(EventLogEntrySchema.parse(entry)).toBeDefined();
    });
  });
});
