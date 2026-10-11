import { describe, it, expect } from 'vitest';
import {
  decideNudge,
  createContextBucket,
  type PlannerState,
  type BanditBucketStats,
  type FeedbackAction,
} from '../../src/background/planner';
import type { PageContext } from '../../src/shared/schemas/context';
import type { StuckEstimate } from '../../src/shared/schemas/signals';
import { DEFAULT_SETTINGS } from '../../src/shared/config';

interface UserProfile {
  name: string;
  pStuckRange: [number, number];
  masteryRange: [number, number];
  acceptProb: number;
  dismissProb: number;
  ignoreProb: number;
}

const PROFILES: UserProfile[] = [
  {
    name: 'Struggling Novice',
    pStuckRange: [0.65, 0.90],
    masteryRange: [0.15, 0.35],
    acceptProb: 0.85,
    dismissProb: 0.10,
    ignoreProb: 0.05,
  },
  {
    name: 'Independent Solver',
    pStuckRange: [0.60, 0.85],
    masteryRange: [0.60, 0.85],
    acceptProb: 0.15,
    dismissProb: 0.75,
    ignoreProb: 0.10,
  },
  {
    name: 'Casual / Distracted',
    pStuckRange: [0.55, 0.75],
    masteryRange: [0.40, 0.60],
    acceptProb: 0.20,
    dismissProb: 0.30,
    ignoreProb: 0.50,
  },
];

interface SimulationStats {
  sessions: number;
  nudgesOffered: number;
  nudgesAccepted: number;
  nudgesDismissed: number;
  nudgesIgnored: number;
  acceptanceRate: number;
}

function updateLocalBucketStats(
  bucketMap: Record<string, BanditBucketStats>,
  bucket: string,
  feedback: FeedbackAction
): void {
  if (!bucketMap[bucket]) {
    bucketMap[bucket] = { accept: 0, dismiss: 0, ignore: 0, n: 0 };
  }
  const cur = bucketMap[bucket];
  cur.n++;
  if (feedback === 'accept') cur.accept++;
  else if (feedback === 'dismiss') cur.dismiss++;
  else if (feedback === 'ignore') cur.ignore++;
}

describe('Planner Simulation: 200 Scripted Problem Sessions (Step 7)', () => {
  it('demonstrates contextual bandit measurably improves acceptance rate over fixed baseline', () => {
    const NUM_SESSIONS = 200;
    const settings = {
      ...DEFAULT_SETTINGS,
      trackingEnabled: true,
      cooldownMin: 0, // Disable time cooldown in simulation to evaluate pure policy decisions per session
      maxNudgesPerHour: 100,
    };

    const fixedStats: SimulationStats = {
      sessions: NUM_SESSIONS,
      nudgesOffered: 0,
      nudgesAccepted: 0,
      nudgesDismissed: 0,
      nudgesIgnored: 0,
      acceptanceRate: 0,
    };

    const banditStats: SimulationStats = {
      sessions: NUM_SESSIONS,
      nudgesOffered: 0,
      nudgesAccepted: 0,
      nudgesDismissed: 0,
      nudgesIgnored: 0,
      acceptanceRate: 0,
    };

    const banditBuckets: Record<string, BanditBucketStats> = {};

    // Seeded pseudo-random generator for reproducible simulation results
    let seed = 42;
    function random(): number {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }

    for (let i = 0; i < NUM_SESSIONS; i++) {
      // Pick user profile: 40% Novice, 35% Independent, 25% Casual
      const rProfile = random();
      const profile = (
        rProfile < 0.40 ? PROFILES[0] : rProfile < 0.75 ? PROFILES[1] : PROFILES[2]
      )!;

      const pStuck =
        profile.pStuckRange[0] +
        random() * (profile.pStuckRange[1] - profile.pStuckRange[0]);
      const mastery =
        profile.masteryRange[0] +
        random() * (profile.masteryRange[1] - profile.masteryRange[0]);

      const context: PageContext = {
        url: `leetcode:prob-${i}`,
        site: 'leetcode',
        title: `Problem ${i}`,
        statementText: 'Problem description...',
        tags: ['Simulation'],
        isContest: false,
        detectedAt: Date.now(),
      };

      const estimate: StuckEstimate = {
        p: pStuck,
        state: pStuck >= 0.60 ? 'stuck' : 'flowing',
        contributions: { dwell: 0.5, wrongSubmissions: 0.5 },
      };

      const state: PlannerState = {
        recentNudges: [],
        lastNudgeTime: 0,
        snoozeUntil: 0,
        blockedSites: [],
        sessionHistories: {},
      };

      // Determine simulated user response if nudged
      const rAction = random();
      let userFeedback: FeedbackAction = 'ignore';
      if (rAction < profile.acceptProb) {
        userFeedback = 'accept';
      } else if (rAction < profile.acceptProb + profile.dismissProb) {
        userFeedback = 'dismiss';
      } else {
        userFeedback = 'ignore';
      }

      // ==========================================
      // Policy A: Fixed-Threshold Baseline (p >= 0.60)
      // ==========================================
      const fixedShouldNudge = pStuck >= 0.60;
      if (fixedShouldNudge) {
        fixedStats.nudgesOffered++;
        if (userFeedback === 'accept') fixedStats.nudgesAccepted++;
        else if (userFeedback === 'dismiss') fixedStats.nudgesDismissed++;
        else fixedStats.nudgesIgnored++;
      }

      // ==========================================
      // Policy B: Contextual Bandit Policy
      // ==========================================
      const bucketKey = createContextBucket(context.site, estimate.p, mastery);
      const currentBucketStats = banditBuckets[bucketKey];

      const banditDecision = decideNudge(
        context,
        estimate,
        settings,
        state,
        currentBucketStats,
        { masteryPKnown: mastery },
        Date.now(),
        random() // random sample for epsilon exploration
      );

      if (banditDecision.show) {
        banditStats.nudgesOffered++;
        if (userFeedback === 'accept') {
          banditStats.nudgesAccepted++;
        } else if (userFeedback === 'dismiss') {
          banditStats.nudgesDismissed++;
        } else {
          banditStats.nudgesIgnored++;
        }

        // Online learning: update bandit bucket stats with user feedback
        updateLocalBucketStats(banditBuckets, bucketKey, userFeedback);
      }
    }

    fixedStats.acceptanceRate =
      fixedStats.nudgesOffered > 0
        ? Math.round((fixedStats.nudgesAccepted / fixedStats.nudgesOffered) * 1000) / 10
        : 0;

    banditStats.acceptanceRate =
      banditStats.nudgesOffered > 0
        ? Math.round((banditStats.nudgesAccepted / banditStats.nudgesOffered) * 1000) / 10
        : 0;

    console.log('\n===== STEP 7: 200-SESSION SIMULATION RESULTS =====');
    console.log(`Fixed Baseline:   ${fixedStats.nudgesOffered} nudges | ${fixedStats.nudgesAccepted} accepts | ${fixedStats.nudgesDismissed} dismissals | ${fixedStats.acceptanceRate}% acceptance rate`);
    console.log(`Contextual Bandit: ${banditStats.nudgesOffered} nudges | ${banditStats.nudgesAccepted} accepts | ${banditStats.nudgesDismissed} dismissals | ${banditStats.acceptanceRate}% acceptance rate`);
    console.log('=================================================\n');

    // Assertions per Step 7 Acceptance Criteria:
    // 1. Bandit acceptance rate is strictly higher than fixed baseline
    expect(banditStats.acceptanceRate).toBeGreaterThan(fixedStats.acceptanceRate);

    // 2. Bandit reduces unwanted dismissals by learning user preferences
    expect(banditStats.nudgesDismissed).toBeLessThan(fixedStats.nudgesDismissed);

    // 3. Overall acceptance rate improvement is substantial (> 10% absolute improvement)
    expect(banditStats.acceptanceRate - fixedStats.acceptanceRate).toBeGreaterThanOrEqual(10.0);
  });
});
