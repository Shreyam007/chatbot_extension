import { createLogger } from '../../shared/logger';
import type { NudgeDecisionRecord } from '../../shared/messaging/protocol';

const logger = createLogger('NudgeDiagnostics');
const STORAGE_KEY = 'nudge_decisions_ring_buffer';
const MAX_BUFFER_SIZE = 50;

// In-memory fallback if session storage is unavailable or worker just woke
let memoryBuffer: NudgeDecisionRecord[] = [];

/**
 * Persists a nudge pipeline evaluation decision into the session ring buffer.
 * Sanitized: Contains zero raw URLs (only domain/site hash) and zero page text.
 */
export async function recordNudgeDecision(record: NudgeDecisionRecord): Promise<void> {
  memoryBuffer.unshift(record);
  if (memoryBuffer.length > MAX_BUFFER_SIZE) {
    memoryBuffer.pop();
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      await chrome.storage.session.set({
        [STORAGE_KEY]: memoryBuffer,
      });
    } catch (err) {
      logger.debug('Failed to write nudge decision to session storage:', err);
    }
  }
}

/**
 * Loads recent decisions from session storage (or in-memory cache)
 */
export async function getNudgeDecisionsHistory(limit = MAX_BUFFER_SIZE): Promise<NudgeDecisionRecord[]> {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      const stored = await chrome.storage.session.get([STORAGE_KEY]);
      if (Array.isArray(stored?.[STORAGE_KEY])) {
        memoryBuffer = stored[STORAGE_KEY];
      }
    } catch (err) {
      logger.debug('Failed to load nudge decisions from session storage:', err);
    }
  }
  return memoryBuffer.slice(0, limit);
}

export const getNudgeDiagnostics = getNudgeDecisionsHistory;

/**
 * Clears the diagnostics ring buffer (e.g. on DELETE_ALL_DATA)
 */
export async function clearNudgeDecisionsHistory(): Promise<void> {
  memoryBuffer = [];
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      await chrome.storage.session.remove([STORAGE_KEY]);
    } catch {
      // ignore
    }
  }
}

/**
 * Generates an intuitive, human-friendly status line explaining "Why no nudge yet?"
 */
export function formatWhyNoNudgeReason(
  latestDecision: NudgeDecisionRecord | null,
  activeThreshold: number = 0.60
): string {
  if (!latestDecision) {
    return 'Waiting for active tab activity...';
  }

  // 1. Check if signals have gone stale (> 60s)
  if (latestDecision.lastSignalAgeSec > 60) {
    return `No signals received in ${Math.round(latestDecision.lastSignalAgeSec)}s (is tab active?)`;
  }

  // 2. If blocked by hard policy gates
  if (latestDecision.gateBlockedReason !== 'shown') {
    const reason = latestDecision.gateBlockedReason;

    if (reason.toLowerCase().includes('tracking consent')) {
      return 'Tracking is disabled in Settings';
    }
    if (reason.toLowerCase().includes('contest')) {
      return 'Contest mode active (fair-play locked)';
    }
    if (reason.toLowerCase().includes('cooldown')) {
      return reason; // e.g. "In cooldown period (120s remaining)"
    }
    if (reason.toLowerCase().includes('snooze')) {
      return 'Nudges currently snoozed by user';
    }
    if (reason.toLowerCase().includes('quiet hours')) {
      return 'Quiet hours active';
    }
    if (reason.toLowerCase().includes('blocked')) {
      return 'Site is on your never-nudge block list';
    }
    if (reason.toLowerCase().includes('generic sites')) {
      return 'Nudges are off by default on generic sites (opt-in)';
    }
    if (reason.toLowerCase().includes('hourly')) {
      return 'Maximum hourly nudges cap reached';
    }
    if (reason.toLowerCase().includes('repeat limit')) {
      return 'Same-problem limit reached (max 3 nudges)';
    }
    if (reason.toLowerCase().includes('inactive')) {
      return 'Tab is currently in the background';
    }
    if (reason.toLowerCase().includes('distracted')) {
      return 'Rapid tab-switching detected (tutoring paused)';
    }
    if (reason.toLowerCase().includes('flowing')) {
      const p = latestDecision.pStuck.toFixed(2);
      const thresh = activeThreshold.toFixed(2);
      return `Looks like you're making progress (p=${p}, nudges at ${thresh})`;
    }

    return reason;
  }

  // 3. If bandit decided to wait
  if (latestDecision.banditAction === 'wait') {
    return 'Bandit pacing (waiting for higher confidence opportunity)';
  }

  return 'Nudge offered to active tab';
}
