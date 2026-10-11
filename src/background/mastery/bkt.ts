import { BKT_CONFIG } from '../../shared/config';
import type { TopicMasteryItem, WeakTopicRecommendation } from '../../shared/schemas/mastery';
import { createLogger } from '../../shared/logger';

const logger = createLogger('BKT');

/**
 * Curated practice recommendations for common LeetCode/Codeforces topic archetypes.
 */
const TOPIC_PRACTICE_DATABASE: Record<
  string,
  {
    problems: Array<{ title: string; difficulty: 'Easy' | 'Medium' | 'Hard'; url: string }>;
    tip: string;
  }
> = {
  'Dynamic Programming': {
    problems: [
      { title: 'Climbing Stairs', difficulty: 'Easy', url: 'https://leetcode.com/problems/climbing-stairs/' },
      { title: 'House Robber', difficulty: 'Medium', url: 'https://leetcode.com/problems/house-robber/' },
      { title: 'Coin Change', difficulty: 'Medium', url: 'https://leetcode.com/problems/coin-change/' },
    ],
    tip: 'Define clear state transitions and verify subproblem overlap before writing memoization.',
  },
  'Binary Search': {
    problems: [
      { title: 'Binary Search', difficulty: 'Easy', url: 'https://leetcode.com/problems/binary-search/' },
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
      { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
    ],
    tip: 'Strictly check loop invariant bounds (left <= right vs left < right) to avoid infinite loops.',
  },
  'Two Pointers': {
    problems: [
      { title: 'Valid Palindrome', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-palindrome/' },
      { title: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium', url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/' },
      { title: '3Sum', difficulty: 'Medium', url: 'https://leetcode.com/problems/3sum/' },
    ],
    tip: 'Ensure pointers move in opposing or synchronized directions monotonically.',
  },
  'Arrays & Hashing': {
    problems: [
      { title: 'Contains Duplicate', difficulty: 'Easy', url: 'https://leetcode.com/problems/contains-duplicate/' },
      { title: 'Group Anagrams', difficulty: 'Medium', url: 'https://leetcode.com/problems/group-anagrams/' },
      { title: 'Top K Frequent Elements', difficulty: 'Medium', url: 'https://leetcode.com/problems/top-k-frequent-elements/' },
    ],
    tip: 'Leverage hash maps for O(1) lookups to trade linear space for quadratic time savings.',
  },
  'Trees & Graphs': {
    problems: [
      { title: 'Invert Binary Tree', difficulty: 'Easy', url: 'https://leetcode.com/problems/invert-binary-tree/' },
      { title: 'Number of Islands', difficulty: 'Medium', url: 'https://leetcode.com/problems/number-of-islands/' },
      { title: 'Clone Graph', difficulty: 'Medium', url: 'https://leetcode.com/problems/clone-graph/' },
    ],
    tip: 'Map traversal strategy explicitly (BFS for shortest path, DFS for deep search/backtracking).',
  },
};

/**
 * Calculates continuous credit attenuation factor based on hint consumption.
 * - 0 hints => 1.0 (Full independent solve credit)
 * - 1 hint  => 0.75
 * - 2 hints => 0.50
 * - 3 hints => 0.25
 * - 4+ hints => 0.10 (Heavy scaffolding)
 */
export function calculateHintAttenuation(hintsUsed: number): number {
  if (hintsUsed <= 0) return 1.0;
  if (hintsUsed === 1) return 0.75;
  if (hintsUsed === 2) return 0.5;
  if (hintsUsed === 3) return 0.25;
  return 0.1;
}

/**
 * Computes next pKnown probability for a topic given prior knowledge and hints consumed.
 * Uses standard Bayesian Knowledge Tracing with continuous partial-credit integration.
 * Guaranteed to produce values strictly in [0.02, 0.98].
 */
export function calculateBktUpdate(
  currentPKnown: number | undefined,
  hintsUsed: number
): number {
  const pPrior =
    currentPKnown !== undefined && !Number.isNaN(currentPKnown)
      ? Math.max(0, Math.min(1, currentPKnown))
      : BKT_CONFIG.PRIOR_P_KNOWN;

  const { P_SLIP, P_GUESS, P_TRANSIT } = BKT_CONFIG;

  // Posterior probabilities given binary success vs failure
  const pSuccessNum = pPrior * (1 - P_SLIP);
  const pSuccessDen = pPrior * (1 - P_SLIP) + (1 - pPrior) * P_GUESS;
  const pPostSuccess = pSuccessDen > 0 ? pSuccessNum / pSuccessDen : pPrior;

  const pFailNum = pPrior * P_SLIP;
  const pFailDen = pPrior * P_SLIP + (1 - pPrior) * (1 - P_GUESS);
  const pPostFail = pFailDen > 0 ? pFailNum / pFailDen : pPrior;

  // Weighted posterior by hint attenuation factor
  const credit = calculateHintAttenuation(hintsUsed);
  const pPost = credit * pPostSuccess + (1 - credit) * pPostFail;

  // Knowledge transition on learning event
  const pNext = pPost + (1 - pPost) * P_TRANSIT;

  // Clamp within robust numerical bounds
  const clamped = Math.max(0.02, Math.min(0.98, pNext));
  logger.debug(
    `BKT update: prior=${pPrior.toFixed(3)}, hints=${hintsUsed}, credit=${credit.toFixed(2)}, next=${clamped.toFixed(3)}`
  );
  return clamped;
}

/**
 * Applies exponential forgetting decay towards prior knowledge baseline over time.
 * If elapsed time is negligible (< 1 hour), no decay is applied.
 */
export function applyTemporalDecay(
  pKnown: number,
  lastUpdatedTimestamp: number | undefined,
  now: number = Date.now()
): number {
  if (!lastUpdatedTimestamp || lastUpdatedTimestamp > now) {
    return pKnown;
  }

  const elapsedMs = now - lastUpdatedTimestamp;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  // If under an hour, preserve exact score
  if (elapsedDays < 0.04) {
    return pKnown;
  }

  const prior = BKT_CONFIG.PRIOR_P_KNOWN;
  const halfLife = BKT_CONFIG.TIME_DECAY_HALF_LIFE_DAYS;
  const decayRate = Math.LN2 / halfLife;

  // Forgetting curve: decays towards prior baseline
  const decayed = prior + (pKnown - prior) * Math.exp(-decayRate * elapsedDays);
  return Math.max(0.02, Math.min(0.98, decayed));
}

/**
 * Recommends starting hint level dynamically based on topic mastery.
 * - High mastery (>= 0.75): L1 (Socratic Direction)
 * - Medium mastery (0.45 .. 0.75): L2 (Algorithmic Invariant)
 * - Low mastery (< 0.45): L3 (Pseudocode Outline to prevent prolonged impasse)
 */
export function recommendStartingHintLevel(pKnown: number | undefined): 1 | 2 | 3 | 4 {
  if (pKnown === undefined || Number.isNaN(pKnown)) {
    return 1;
  }
  if (pKnown >= 0.75) {
    return 1;
  }
  if (pKnown >= 0.45) {
    return 2;
  }
  return 3;
}

/**
 * Identifies weak topics (< 0.60 pKnown) from student mastery records.
 * Sorts by weakest first and provides actionable practice problems.
 */
export function identifyWeakTopics(
  mastery: Record<string, TopicMasteryItem>,
  now: number = Date.now()
): WeakTopicRecommendation[] {
  const weakList: WeakTopicRecommendation[] = [];

  for (const [topic, item] of Object.entries(mastery)) {
    const decayedPKnown = applyTemporalDecay(item.pKnown, item.lastUpdated, now);

    if (decayedPKnown < BKT_CONFIG.WEAK_THRESHOLD) {
      const dbEntry = TOPIC_PRACTICE_DATABASE[topic] || {
        problems: [
          { title: `${topic} Fundamentals`, difficulty: 'Easy' as const, url: 'https://leetcode.com/problemset/' },
          { title: `${topic} Core Problem`, difficulty: 'Medium' as const, url: 'https://leetcode.com/problemset/' },
        ],
        tip: `Focus on mastering the core recursion and loop invariants for ${topic}.`,
      };

      weakList.push({
        topic,
        pKnown: Math.round(decayedPKnown * 100) / 100,
        attempts: item.attempts,
        hintsUsed: item.hintsUsed,
        recommendedProblems: dbEntry.problems,
        studyTip: dbEntry.tip,
      });
    }
  }

  // Sort ascending: lowest pKnown (weakest) first
  weakList.sort((a, b) => a.pKnown - b.pKnown);
  return weakList;
}
