// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignalCollector } from '../../src/content/signals/collector';
import { leetcodeAdapter } from '../../src/content/adapters/leetcode';
import { estimateStuckState } from '../../src/background/detector';
import { decideNudge } from '../../src/background/planner';
import { DEFAULT_SETTINGS } from '../../src/shared/config';
import type { PageContext } from '../../src/shared/schemas/context';
import type { PlannerState } from '../../src/background/planner/types';

describe('Signal Flow & Scenario Tests (Task B)', () => {
  let collector: SignalCollector;

  beforeEach(() => {
    vi.useFakeTimers();
    // Setup real-DOM fixture for a LeetCode problem
    document.body.innerHTML = `
      <div id="__next">
        <div class="text-title-large">1. Two Sum</div>
        <div data-track-load="description_content" class="elfjS">
          <p>Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.</p>
          <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>
        </div>
        <div class="monaco-editor">
          <div class="view-lines">
            <div class="view-line">class Solution:</div>
            <div class="view-line">    def twoSum(self, nums, target):</div>
            <div class="view-line">        pass</div>
          </div>
        </div>
      </div>
    `;

    collector = new SignalCollector({
      idleThresholdMs: 60_000,
      scrollThresholdPx: 80,
    });
  });

  afterEach(() => {
    collector.destroy();
    vi.useRealTimers();
  });

  it('Task B.1: 10 simulated minutes of active reading and typing produces correct dwell and triggers stuck on LeetCode', () => {
    collector.start();

    // Verify context extraction from real-DOM fixture
    const context = leetcodeAdapter.extractContext(document, new URL('https://leetcode.com/problems/two-sum/'));
    expect(context).not.toBeNull();
    expect(context?.title).toBe('1. Two Sum');
    expect(context?.statementText).toContain('Given an array of integers nums');
    expect(context?.statementLength).toBeGreaterThan(50);
    expect(context?.adapterName).toBe('leetcode');

    // Simulate 10 minutes of active reading and typing (periodic activity every 15s to keep activeMs accumulating)
    for (let second = 0; second < 600; second++) {
      vi.advanceTimersByTime(1000);
      collector.tick();

      if (second % 15 === 0) {
        window.dispatchEvent(new Event('keydown'));
      }
    }

    const snapshot = collector.getSnapshot();
    // Report values produced after 10 simulated minutes
    expect(snapshot.activeMs).toBeGreaterThanOrEqual(590_000);
    expect(snapshot.dwellMs).toBeGreaterThanOrEqual(590_000);
    expect(snapshot.idleMs).toBe(0);
    expect(snapshot.wrongSubmissions).toBe(0);
    expect(snapshot.scrollReversals).toBe(0);

    // Run detector on problem page
    const estimateProblem = estimateStuckState(snapshot, {
      isProblemPage: true,
      nudgeAfterMinutes: 8,
      sensitivity: 'medium',
    });

    expect(estimateProblem.p).toBeGreaterThanOrEqual(0.60);
    expect(estimateProblem.state).toBe('stuck');
    expect(estimateProblem.nudgeText).toBe("You've been on this one a while. Want a hint?");

    // Run detector on article page with identical 10m signals -> must remain flowing capped at 0.40 (EC-040)
    const estimateArticle = estimateStuckState(snapshot, {
      isProblemPage: false,
      contentType: 'article',
      nudgeAfterMinutes: 8,
    });

    expect(estimateArticle.p).toBeLessThanOrEqual(0.40);
    expect(estimateArticle.state).toBe('flowing');
  });

  it('Task B.6 Scenarios: reading 10 min without submissions on problem page vs article page', () => {
    const problemContext: PageContext = {
      url: 'leetcode:two-sum',
      site: 'leetcode',
      title: 'Two Sum',
      statementText: 'Given an array of integers...',
      statementLength: 29,
      adapterName: 'leetcode',
      tags: ['array', 'hash-table'],
      isContest: false,
      detectedAt: Date.now(),
      contentType: 'problem',
    };

    const articleContext: PageContext = {
      ...problemContext,
      url: 'generic:react-docs',
      site: 'generic',
      title: 'React Documentation',
      contentType: 'article',
    };

    const signals10m = {
      dwellMs: 600_000,
      activeMs: 600_000,
      idleMs: 0,
      wrongSubmissions: 0,
      scrollReversals: 0,
      tabSwitches: 0,
      windowStart: Date.now() - 600_000,
      windowEnd: Date.now(),
    };

    const plannerState: PlannerState = {
      lastNudgeTime: 0,
      recentNudges: [],
      snoozeUntil: 0,
      sessionHistories: {},
      blockedSites: [],
    };

    const settings = {
      ...DEFAULT_SETTINGS,
      trackingEnabled: true,
      allowedOrigins: [{ origin: 'generic:react-docs', grantedAt: Date.now(), status: 'active' as const, enabledNudges: true }],
    };

    // 1. Problem page: nudge offered
    const estProblem = estimateStuckState(signals10m, { isProblemPage: true, nudgeAfterMinutes: 8 });
    const decProblem = decideNudge(problemContext, estProblem, settings, plannerState, undefined, {}, Date.now(), 0.99);
    expect(decProblem.show).toBe(true);
    expect(decProblem.nudgeText).toBe("You've been on this one a while. Want a hint?");

    // 2. Article page: no nudge
    const estArticle = estimateStuckState(signals10m, { isProblemPage: false, contentType: 'article', nudgeAfterMinutes: 8 });
    const decArticle = decideNudge(articleContext, estArticle, settings, plannerState);
    expect(decArticle.show).toBe(false);
    expect(decArticle.reason).toBe('User is flowing comfortably');

    // 3. One rapid page flip (dwell < 10s) on problem page: no nudge
    const signalsRapid = { ...signals10m, dwellMs: 8000, activeMs: 8000 };
    const estRapid = estimateStuckState(signalsRapid, { isProblemPage: true, nudgeAfterMinutes: 8 });
    const decRapid = decideNudge(problemContext, estRapid, settings, plannerState);
    expect(decRapid.show).toBe(false);

    // 4. 2 wrong submissions on problem page: nudge offered immediately
    const signals2Wrong = { ...signals10m, dwellMs: 120_000, activeMs: 120_000, wrongSubmissions: 2, scrollReversals: 2 };
    const est2Wrong = estimateStuckState(signals2Wrong, { isProblemPage: true });
    const dec2Wrong = decideNudge(problemContext, est2Wrong, settings, plannerState, undefined, {}, Date.now(), 0.99);
    expect(dec2Wrong.show).toBe(true);
    expect(dec2Wrong.nudgeText).toBe('Looks like this problem is tricky. Want a nudge?');

    // 5. Cooldown respected: when last nudge occurred 5 minutes ago (cooldown 15m), silenced
    const stateInCooldown: PlannerState = {
      ...plannerState,
      lastNudgeTime: Date.now() - 300_000,
    };
    const decCooldown = decideNudge(problemContext, estProblem, settings, stateInCooldown);
    expect(decCooldown.show).toBe(false);
    expect(decCooldown.reason).toContain('cooldown period');

    // 6. Quiet hours: silenced when quiet hours active
    const settingsQuiet = {
      ...settings,
      quietHours: { enabled: true, start: '00:00', end: '23:59' },
    };
    const decQuiet = decideNudge(problemContext, estProblem, settingsQuiet, plannerState);
    expect(decQuiet.show).toBe(false);
    expect(decQuiet.reason).toContain('Quiet hours');

    // 7. Contest page: silenced
    const contestContext: PageContext = { ...problemContext, isContest: true };
    const decContest = decideNudge(contestContext, estProblem, settings, plannerState);
    expect(decContest.show).toBe(false);
    expect(decContest.reason).toContain('Contest detected');

    // 8. Tracking off: silenced
    const settingsUntracked = { ...settings, trackingEnabled: false };
    const decUntracked = decideNudge(problemContext, estProblem, settingsUntracked, plannerState);
    expect(decUntracked.show).toBe(false);
    expect(decUntracked.reason).toContain('Tracking consent disabled');
  });
});
