import type { BanditAction, FeedbackAction, BanditBucketStats } from './types';
import { updateBanditBucket } from '../../shared/storage';

export const COLD_START_PRIORS: BanditBucketStats = {
  accept: 1,
  dismiss: 1,
  ignore: 0,
  n: 2,
};

/**
 * Discretizes continuous state into discrete context bucket:
 * site x stuckBucket x masteryBucket (e.g. "leetcode:high:novice")
 */
export function createContextBucket(
  site: string,
  pStuck: number,
  masteryPKnown: number = 0.5
): string {
  const normSite = site.toLowerCase().includes('leetcode')
    ? 'leetcode'
    : site.toLowerCase().includes('codeforces')
    ? 'codeforces'
    : 'generic';

  let stuckBucket: 'low' | 'medium' | 'high';
  if (pStuck < 0.60) {
    stuckBucket = 'low';
  } else if (pStuck < 0.80) {
    stuckBucket = 'medium';
  } else {
    stuckBucket = 'high';
  }

  let masteryBucket: 'novice' | 'intermediate' | 'advanced';
  if (masteryPKnown < 0.35) {
    masteryBucket = 'novice';
  } else if (masteryPKnown < 0.70) {
    masteryBucket = 'intermediate';
  } else {
    masteryBucket = 'advanced';
  }

  return `${normSite}:${stuckBucket}:${masteryBucket}`;
}

/**
 * Calculates empirical expected reward Q(s, nudge_now) from bucket statistics
 */
export function calculateExpectedReward(stats?: BanditBucketStats): number {
  const current = stats && stats.n > 0 ? stats : COLD_START_PRIORS;
  const total = current.n > 0 ? current.n : 1;

  const score =
    current.accept * 1.0 +
    current.dismiss * -1.0 +
    current.ignore * -0.5;

  return score / total;
}

/**
 * Computes epsilon exploration probability with decay over number of observations
 */
export function computeEpsilon(n: number = 0, initialEpsilon: number = 0.15): number {
  return Math.max(0.05, initialEpsilon / (1 + 0.02 * n));
}

/**
 * Selects action using epsilon-greedy strategy over empirical expected reward
 */
export function selectBanditAction(
  stats?: BanditBucketStats,
  randomSample: number = Math.random()
): { action: BanditAction; isExploration: boolean; expectedReward: number } {
  const currentStats = stats && stats.n > 0 ? stats : COLD_START_PRIORS;
  const epsilon = computeEpsilon(currentStats.n);
  const qNudge = calculateExpectedReward(currentStats);

  // Epsilon exploration
  if (randomSample < epsilon) {
    // 50/50 exploration choice
    const exploreAction: BanditAction = randomSample < epsilon / 2 ? 'nudge_now' : 'wait';
    return {
      action: exploreAction,
      isExploration: true,
      expectedReward: qNudge,
    };
  }

  // Exploitation: choose nudge_now if expected reward is non-negative, else wait
  const action: BanditAction = qNudge >= -0.15 ? 'nudge_now' : 'wait';
  return {
    action,
    isExploration: false,
    expectedReward: qNudge,
  };
}

/**
 * Updates bucket stats with user reward feedback and persists in IndexedDB
 */
export async function recordBanditFeedback(
  bucket: string,
  feedback: FeedbackAction
): Promise<BanditBucketStats> {
  const delta: Partial<BanditBucketStats> = {};

  switch (feedback) {
    case 'accept':
      delta.accept = 1;
      delta.dismiss = 0;
      delta.ignore = 0;
      break;
    case 'dismiss':
      delta.accept = 0;
      delta.dismiss = 1;
      delta.ignore = 0;
      break;
    case 'ignore':
      delta.accept = 0;
      delta.dismiss = 0;
      delta.ignore = 1;
      break;
    case 'block_site':
      // Severe negative penalty
      delta.accept = 0;
      delta.dismiss = 2;
      delta.ignore = 0;
      break;
  }

  // Persist directly to IndexedDB 'bandit' store
  const updated = await updateBanditBucket(bucket, delta);
  return updated;
}
