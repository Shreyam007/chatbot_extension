import type {
  NudgeDecision,
  StuckEstimate,
  PageContext,
  Settings,
  PlannerState,
  PlannerOptions,
  BanditBucketStats,
} from './types';
import { evaluateHardGates } from './gates';
import { createContextBucket, selectBanditAction } from './bandit';

/**
 * Main planner decision function:
 * Evaluates hard policy gates, expected utility, and contextual bandit to return NudgeDecision.
 */
export function decideNudge(
  context: PageContext,
  estimate: StuckEstimate,
  settings: Partial<Settings>,
  state: PlannerState,
  bucketStats?: BanditBucketStats,
  options: PlannerOptions = {},
  now: number = Date.now(),
  randomSample?: number
): NudgeDecision {
  const masteryPKnown = options.masteryPKnown ?? 0.5;
  const contextBucket = createContextBucket(context.site, estimate.p, masteryPKnown);
  const interruptionCost = 0.35;

  // 1. Evaluate Hard Policy Gates (EC-060, EC-062, EC-064, EC-100)
  const gateResult = evaluateHardGates(context, estimate, settings, state, options, now);
  if (!gateResult.pass) {
    return {
      show: false,
      reason: gateResult.reason || 'Blocked by policy gate',
      utility: 0,
      cost: interruptionCost,
      contextBucket,
      nudgeText: estimate.nudgeText,
    };
  }

  // 2. Compute Expected Utility
  // utility = p(stuck) * helpValue(mastery) - interruptionCost
  const helpValue = 0.80 + 0.20 * (1 - masteryPKnown);
  const utility = Math.round((estimate.p * helpValue - interruptionCost) * 1000) / 1000;

  if (utility <= 0) {
    return {
      show: false,
      reason: 'Interruption cost exceeds expected tutoring utility',
      utility,
      cost: interruptionCost,
      contextBucket,
      nudgeText: estimate.nudgeText,
    };
  }

  // 3. Contextual Bandit Action Selection (Epsilon-greedy with online learning)
  const banditDecision = selectBanditAction(bucketStats, randomSample);

  if (banditDecision.action === 'wait') {
    return {
      show: false,
      reason: 'Bandit policy elected to wait based on historical dismiss feedback',
      utility,
      cost: interruptionCost,
      contextBucket,
      nudgeText: estimate.nudgeText,
    };
  }

  // 4. Nudge Approved
  const reason = banditDecision.isExploration
    ? 'Exploration nudge offered to test user preference'
    : 'Observation suggests assistance on current step would be high value';

  return {
    show: true,
    reason,
    utility,
    cost: interruptionCost,
    contextBucket,
    nudgeText: estimate.nudgeText,
  };
}
