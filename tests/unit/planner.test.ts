import { describe, it, expect, beforeEach } from 'vitest';
import {
  decideNudge,
  evaluateHardGates,
  createContextBucket,
  calculateExpectedReward,
  isWithinQuietHours,
  type PlannerState,
  type BanditBucketStats,
} from '../../src/background/planner';
import type { PageContext } from '../../src/shared/schemas/context';
import type { StuckEstimate } from '../../src/shared/schemas/signals';
import type { Settings } from '../../src/shared/schemas/settings';
import { DEFAULT_SETTINGS } from '../../src/shared/config';

function createMockContext(overrides: Partial<PageContext> = {}): PageContext {
  return {
    url: 'leetcode:two-sum',
    site: 'leetcode',
    title: 'Two Sum',
    statementText: 'Given an array of integers...',
    tags: ['Array'],
    isContest: false,
    detectedAt: Date.now(),
    ...overrides,
  };
}

function createMockEstimate(overrides: Partial<StuckEstimate> = {}): StuckEstimate {
  return {
    p: 0.75,
    state: 'stuck',
    contributions: { wrongSubmissions: 0.6, dwell: 0.4 },
    ...overrides,
  };
}

function createMockPlannerState(overrides: Partial<PlannerState> = {}): PlannerState {
  return {
    recentNudges: [],
    lastNudgeTime: 0,
    snoozeUntil: 0,
    blockedSites: [],
    sessionHistories: {},
    ...overrides,
  };
}

describe('Planner & Policy Gates (Step 7)', () => {
  let context: PageContext;
  let estimate: StuckEstimate;
  let settings: Settings;
  let state: PlannerState;

  beforeEach(() => {
    context = createMockContext();
    estimate = createMockEstimate();
    settings = { ...DEFAULT_SETTINGS, trackingEnabled: true };
    state = createMockPlannerState();
  });

  describe('Hard Policy Gates (EC-060, EC-062, EC-064, EC-100)', () => {
    it('blocks nudge when tracking consent is disabled (EC-001)', () => {
      const gate = evaluateHardGates(context, estimate, { trackingEnabled: false }, state);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('Tracking consent disabled');
    });

    it('blocks nudge when contest is detected (EC-100)', () => {
      const contestContext = createMockContext({ isContest: true });
      const gate = evaluateHardGates(contestContext, estimate, settings, state);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('Contest detected');
    });

    it('blocks nudge when site is in user block list (EC-062)', () => {
      const blockedState = createMockPlannerState({ blockedSites: ['leetcode'] });
      const gate = evaluateHardGates(context, estimate, settings, blockedState);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('blocked by user');
    });

    it('blocks nudge when snooze is active', () => {
      const now = Date.now();
      const snoozedState = createMockPlannerState({ snoozeUntil: now + 600_000 });
      const gate = evaluateHardGates(context, estimate, settings, snoozedState, {}, now);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('snoozed');
    });

    it('blocks nudge during quiet hours', () => {
      const quietSettings: Partial<Settings> = {
        ...settings,
        quietHours: { enabled: true, start: '23:00', end: '07:00' },
      };
      // 23:30 (during quiet hours)
      const lateNight = new Date(2026, 0, 1, 23, 30).getTime();
      const gate = evaluateHardGates(context, estimate, quietSettings, state, {}, lateNight);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('Quiet hours');

      // 14:00 (outside quiet hours)
      const afternoon = new Date(2026, 0, 1, 14, 0).getTime();
      const gateDay = evaluateHardGates(context, estimate, quietSettings, state, {}, afternoon);
      expect(gateDay.pass).toBe(true);
    });

    it('evaluates isWithinQuietHours correctly across midnight boundary', () => {
      expect(isWithinQuietHours(new Date(2026, 0, 1, 23, 15), 23, 7)).toBe(true);
      expect(isWithinQuietHours(new Date(2026, 0, 1, 2, 0), 23, 7)).toBe(true);
      expect(isWithinQuietHours(new Date(2026, 0, 1, 6, 59), 23, 7)).toBe(true);
      expect(isWithinQuietHours(new Date(2026, 0, 1, 7, 0), 23, 7)).toBe(false);
      expect(isWithinQuietHours(new Date(2026, 0, 1, 12, 0), 23, 7)).toBe(false);
    });

    it('blocks nudge during cooldown period and respects demo mode (EC-066)', () => {
      const now = Date.now();
      // Nudged 5 minutes ago with 15m default cooldown
      const cooldownState = createMockPlannerState({ lastNudgeTime: now - 300_000 });
      const gateStandard = evaluateHardGates(context, estimate, settings, cooldownState, {}, now);
      expect(gateStandard.pass).toBe(false);
      expect(gateStandard.reason).toContain('cooldown period');

      // In demo mode: cooldown is shortened to 20 seconds (EC-066)
      const demoState = createMockPlannerState({ lastNudgeTime: now - 25_000 });
      const gateDemo = evaluateHardGates(
        context,
        estimate,
        settings,
        demoState,
        { demoMode: true },
        now
      );
      expect(gateDemo.pass).toBe(true);
    });

    it('blocks nudge when hourly frequency cap is reached', () => {
      const now = Date.now();
      // 4 nudges in the last 40 minutes (max: 4)
      const cappedState = createMockPlannerState({
        recentNudges: [now - 2_000_000, now - 1_500_000, now - 1_000_000, now - 500_000],
      });
      const gate = evaluateHardGates(context, estimate, settings, cappedState, {}, now);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('hourly nudges cap reached');
    });

    it('blocks nudge when same problem reaches 3 nudges without a solve', () => {
      const problemState = createMockPlannerState({
        sessionHistories: {
          'leetcode:two-sum': {
            problemHash: 'leetcode:two-sum',
            nudgeCount: 3,
            lastNudgeTime: Date.now() - 1_000_000,
            solved: false,
          },
        },
      });
      const gate = evaluateHardGates(context, estimate, settings, problemState);
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('Same-problem repeat limit reached');
    });

    it('blocks nudge when tab is inactive (EC-064: only active tab nudges)', () => {
      const gate = evaluateHardGates(context, estimate, settings, state, { isTabActive: false });
      expect(gate.pass).toBe(false);
      expect(gate.reason).toContain('Tab is inactive');
    });

    it('blocks nudge when user is in flowing or distracted state', () => {
      const flowingEstimate = createMockEstimate({ state: 'flowing', p: 0.25 });
      const gateFlowing = evaluateHardGates(context, flowingEstimate, settings, state);
      expect(gateFlowing.pass).toBe(false);

      const distractedEstimate = createMockEstimate({ state: 'distracted', p: 0.70 });
      const gateDistracted = evaluateHardGates(context, distractedEstimate, settings, state);
      expect(gateDistracted.pass).toBe(false);
    });
  });

  describe('Contextual Bucketing & Bandit Decisions', () => {
    it('discretizes context into site:stuckBucket:masteryBucket', () => {
      expect(createContextBucket('leetcode.com', 0.85, 0.2)).toBe('leetcode:high:novice');
      expect(createContextBucket('codeforces.com', 0.65, 0.5)).toBe('codeforces:medium:intermediate');
      expect(createContextBucket('other-site.org', 0.30, 0.9)).toBe('generic:low:advanced');
    });

    it('cold start initializes with reasonable priors (EC-065)', () => {
      const q = calculateExpectedReward();
      expect(q).toBe(0); // accept (1) + dismiss (-1) / 2 = 0
    });

    it('calculates expected utility and approves nudge when utility is positive', () => {
      const decision = decideNudge(context, estimate, settings, state, undefined, {
        masteryPKnown: 0.2, // novice, high helpValue
      }, Date.now(), 0.99); // sample 0.99 for exploitation

      expect(decision.show).toBe(true);
      expect(decision.utility).toBeGreaterThan(0);
      expect(decision.cost).toBe(0.35);
      expect(decision.contextBucket).toBe('leetcode:medium:novice');
    });

    it('bandit policy elects to wait after repeated user dismissals (EC-061)', () => {
      // Bucket with 5 dismissals and 0 accepts
      const hostileStats: BanditBucketStats = {
        accept: 0,
        dismiss: 5,
        ignore: 1,
        n: 6,
      };

      const decision = decideNudge(
        context,
        estimate,
        settings,
        state,
        hostileStats,
        {},
        Date.now(),
        0.99 // exploitation sample
      );

      expect(decision.show).toBe(false);
      expect(decision.reason).toContain('wait based on historical dismiss');
    });

    it('bandit policy encourages nudging after positive user accepts', () => {
      const receptiveStats: BanditBucketStats = {
        accept: 5,
        dismiss: 0,
        ignore: 0,
        n: 5,
      };

      const decision = decideNudge(
        context,
        estimate,
        settings,
        state,
        receptiveStats,
        {},
        Date.now(),
        0.99
      );

      expect(decision.show).toBe(true);
      expect(decision.reason).toContain('Observation suggests assistance');
    });
  });
});
