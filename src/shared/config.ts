/**
 * Global configuration constants, limits, and thresholds for Unstuck
 */

export const APP_NAME = 'Unstuck';
export const APP_VERSION = '1.0.11';

/**
 * Gemini AI Model Configuration (Official active IDs from ai.google.dev)
 */
export const DEFAULT_AI_MODEL = 'gemini-2.5-flash';
export const SUPPORTED_AI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
] as const;

/**
 * Content and Context Limits
 */
export const LIMITS = {
  // Max character length for scraped statement text before token budget prioritization
  MAX_STATEMENT_CHARS: 16000,
  // Section caps for universal / documentation pages
  MAX_SECTIONS_COUNT: 60,
  MAX_SECTION_CHARS: 4000,
  MAX_TOTAL_SECTIONS_CHARS: 60000,
  // Hard cap on user chat message length to prevent unbounded token usage (EC-092)
  MAX_USER_MESSAGE_CHARS: 2000,
  // Ring buffer and local storage caps
  MAX_EVENT_LOG_ENTRIES: 500,
  MAX_LOGGER_ENTRIES: 200,
  // Network and timeout defaults
  NETWORK_TIMEOUT_MS: 20000,
  MAX_CRITIC_RETRIES: 2,
  MAX_LLM_RETRIES: 3,
};

/**
 * Stuck Detector Feature Weights & Thresholds
 */
export const DETECTOR_CONFIG = {
  STUCK_THRESHOLD: 0.65,
  DISTRACTED_THRESHOLD: 0.70,
  // Logistic regression feature weights
  WEIGHTS: {
    dwell: 0.40,
    scrollReversals: 0.25,
    wrongSubmissions: 0.50,
    tabSwitches: 0.30,
    idle: -0.20,
  },
  // Exponential smoothing alpha
  SMOOTHING_ALPHA: 0.3,
  // Monotonic clamp boundaries
  MAX_DWELL_MS: 30 * 60 * 1000, // 30 minutes
};

/**
 * Bandit Learning Hyperparameters
 */
export const BANDIT_CONFIG = {
  EPSILON: 0.1, // Exploration rate
  REWARDS: {
    ACCEPT: 1.0,
    DISMISS: -1.0,
    IGNORE: -0.5,
    NEVER_NUDGE_HERE: -2.0,
  },
};

/**
 * Bayesian Knowledge Tracing (BKT-lite) Hyperparameters
 */
export const BKT_CONFIG = {
  PRIOR_P_KNOWN: 0.30,      // P(L0): Default prior probability for unseen topics
  P_TRANSIT: 0.15,          // P(T): Probability of learning/transitioning on practice
  P_SLIP: 0.10,             // P(S): Probability of slip (needing hint despite knowing)
  P_GUESS: 0.20,            // P(G): Probability of guess (correct solve without knowing)
  TIME_DECAY_HALF_LIFE_DAYS: 30, // Forgetting curve half-life in days
  WEAK_THRESHOLD: 0.60,     // Topics with pKnown < 0.60 classified as weak
  MASTERY_THRESHOLD: 0.85,  // Topics with pKnown >= 0.85 considered mastered
};

/**
 * Default User Settings
 */
export const DEFAULT_SETTINGS = {
  trackingEnabled: false,
  nudgeSensitivity: 'medium' as const,
  cooldownMin: 15,
  maxNudgesPerHour: 4,
  quietHours: { enabled: false, start: '22:00', end: '08:00' },
  defaultHintLevel: 1 as const,
  enabledSites: ['leetcode.com', 'codeforces.com'],
  blockedSites: [] as string[],
  allowedOrigins: [] as Array<{ origin: string; grantedAt: number; status: 'active' | 'paused'; enabledNudges: boolean }>,
  neverSendPageTextSites: [] as string[],
  neverNudgeSites: [] as string[],
  customBlacklistPatterns: [] as string[],
  confirmedSendSites: [] as string[],
  contestAutoDisable: true as const,
  model: DEFAULT_AI_MODEL,
  includeCodeConsent: false,
  demoMode: false,
  nudgeAfterMinutes: 8,
  lowQuotaMode: true,
};

