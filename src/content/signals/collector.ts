import type { SignalWindow } from '../../shared/schemas/signals';
import type { VerdictResult } from '../adapters/types';
import { createLogger } from '../../shared/logger';

const logger = createLogger('SignalCollector');

export interface SignalCollectorOptions {
  idleThresholdMs?: number; // default: 60,000 ms (EC-042)
  scrollThresholdPx?: number; // min scroll distance before direction change counts (default: 80px)
  verdictDedupeWindowMs?: number; // default: 5,000 ms (EC-045)
}

export class SignalCollector {
  private windowStartTime: number;
  private lastPerfTime: number;
  private lastActivityPerfTime: number;

  private totalDwellMs: number = 0;
  private totalActiveMs: number = 0;
  private totalIdleMs: number = 0;

  private scrollReversals: number = 0;
  private lastScrollY: number = 0;
  private lastScrollDirection: 'up' | 'down' | null = null;
  private accumulatedScrollDistance: number = 0;

  private tabSwitches: number = 0;
  private wrongSubmissions: number = 0;
  private lastWrongVerdictTime: number = 0;
  private lastWrongVerdictText: string | null = null;

  private isIdle: boolean = false;
  private isVisible: boolean = true;
  private isFocused: boolean = true;

  private readonly idleThresholdMs: number;
  private readonly scrollThresholdPx: number;
  private readonly verdictDedupeWindowMs: number;

  private boundOnActivity: (e: Event) => void;
  private boundOnScroll: (e: Event) => void;
  private boundOnVisibilityChange: () => void;
  private boundOnFocus: () => void;
  private boundOnBlur: () => void;
  private tickIntervalId: number | null = null;

  constructor(options: SignalCollectorOptions = {}) {
    this.idleThresholdMs = options.idleThresholdMs ?? 60_000;
    this.scrollThresholdPx = options.scrollThresholdPx ?? 80;
    this.verdictDedupeWindowMs = options.verdictDedupeWindowMs ?? 5_000;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.windowStartTime = Date.now();
    this.lastPerfTime = now;
    this.lastActivityPerfTime = now;

    if (typeof document !== 'undefined') {
      this.isVisible = document.visibilityState !== 'hidden';
      this.isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
      this.lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    }

    this.boundOnActivity = this.handleUserActivity.bind(this);
    this.boundOnScroll = this.handleScroll.bind(this);
    this.boundOnVisibilityChange = this.handleVisibilityChange.bind(this);
    this.boundOnFocus = this.handleFocus.bind(this);
    this.boundOnBlur = this.handleBlur.bind(this);
  }

  public start(): void {
    if (typeof window === 'undefined') return;

    // Activity listeners
    ['keydown', 'mousedown', 'mousemove', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, this.boundOnActivity, { passive: true });
    });

    window.addEventListener('scroll', this.boundOnScroll, { passive: true });
    document.addEventListener('visibilitychange', this.boundOnVisibilityChange);
    window.addEventListener('focus', this.boundOnFocus);
    window.addEventListener('blur', this.boundOnBlur);

    // Periodic time tick (every 1s) to advance dwell / active / idle time monotonically
    this.tickIntervalId = window.setInterval(() => {
      this.tick();
    }, 1000) as unknown as number;
  }

  public tick(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const delta = now - this.lastPerfTime;
    this.lastPerfTime = now;

    // Nothing elapsed
    if (delta === 0) {
      return;
    }

    // Discard impossible windows (clock changes / system sleep / negative, EC-043)
    if (delta < 0 || delta > 3_600_000) {
      logger.warn(`Discarding anomalous delta: ${delta}ms (EC-043)`);
      return;
    }

    // Check if idle threshold reached (EC-042)
    const timeSinceActivity = now - this.lastActivityPerfTime;
    if (timeSinceActivity > this.idleThresholdMs) {
      this.isIdle = true;
    }

    // EC-041: No dwell accumulation while tab hidden or window blurred
    const isActiveWindow = this.isVisible && this.isFocused;

    if (!isActiveWindow) {
      // Backgrounded / blurred tab: no dwell accumulated
      return;
    }

    // While visible and focused:
    this.totalDwellMs += delta;

    if (this.isIdle) {
      this.totalIdleMs += delta;
    } else {
      this.totalActiveMs += delta;
    }
  }

  private handleUserActivity(): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastActivityPerfTime = now;
    if (this.isIdle) {
      this.isIdle = false;
      logger.debug('User resumed activity, exiting idle state');
    }
  }

  private handleScroll(): void {
    this.handleUserActivity();

    const currentY = window.scrollY;
    const diff = currentY - this.lastScrollY;

    if (Math.abs(diff) < 5) return; // Micro-scroll jitter ignored

    const direction: 'up' | 'down' = diff > 0 ? 'down' : 'up';

    if (this.lastScrollDirection === null) {
      this.lastScrollDirection = direction;
      this.accumulatedScrollDistance = Math.abs(diff);
    } else if (this.lastScrollDirection === direction) {
      this.accumulatedScrollDistance += Math.abs(diff);
    } else {
      // Direction reversed! Check if previous distance exceeded threshold
      if (this.accumulatedScrollDistance >= this.scrollThresholdPx) {
        this.scrollReversals++;
        logger.debug(`Scroll reversal detected (total: ${this.scrollReversals})`);
      }
      this.lastScrollDirection = direction;
      this.accumulatedScrollDistance = Math.abs(diff);
    }

    this.lastScrollY = currentY;
  }

  private handleVisibilityChange(): void {
    this.tick();
    const wasVisible = this.isVisible;
    this.isVisible = document.visibilityState !== 'hidden';

    if (wasVisible && !this.isVisible) {
      // Switched away from tab
      this.tabSwitches++;
      logger.debug(`Tab switched away (total: ${this.tabSwitches})`);
    } else if (this.isVisible) {
      this.handleUserActivity();
    }
  }

  private handleFocus(): void {
    this.tick();
    this.isFocused = true;
    this.handleUserActivity();
  }

  private handleBlur(): void {
    this.tick();
    this.isFocused = false;
  }

  /**
   * Record a submission verdict result. Deduplicates rapid wrong submissions (EC-045).
   */
  public addVerdictResult(result: VerdictResult): void {
    if (result.verdict === 'wrong') {
      const now = Date.now();
      const verdictText = result.rawText || 'wrong';

      // Deduplicate if identical verdict within dedupe window or same text within window
      if (
        now - this.lastWrongVerdictTime < this.verdictDedupeWindowMs &&
        verdictText === this.lastWrongVerdictText
      ) {
        logger.debug('Deduplicated rapid wrong submission verdict (EC-045)');
        return;
      }

      this.wrongSubmissions++;
      this.lastWrongVerdictTime = now;
      this.lastWrongVerdictText = verdictText;
      logger.info(`Recorded wrong submission #${this.wrongSubmissions}: ${verdictText}`);
    }
  }

  /**
   * Reset all counters and window metrics for a new problem (EC-022).
   */
  public reset(): void {
    const nowPerf = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.windowStartTime = Date.now();
    this.lastPerfTime = nowPerf;
    this.lastActivityPerfTime = nowPerf;

    this.totalDwellMs = 0;
    this.totalActiveMs = 0;
    this.totalIdleMs = 0;
    this.scrollReversals = 0;
    this.accumulatedScrollDistance = 0;
    this.lastScrollDirection = null;
    this.tabSwitches = 0;
    this.wrongSubmissions = 0;
    this.lastWrongVerdictTime = 0;
    this.lastWrongVerdictText = null;
    this.isIdle = false;

    if (typeof window !== 'undefined') {
      this.lastScrollY = window.scrollY;
      this.isVisible = document.visibilityState !== 'hidden';
      this.isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
    }

    logger.debug('Signal collector state reset');
  }

  /**
   * Take a validated snapshot of the current signal window.
   */
  public getSnapshot(): SignalWindow {
    this.tick();
    const now = Date.now();
    const end = Math.max(now, this.windowStartTime);

    return {
      dwellMs: Math.max(0, Math.round(this.totalDwellMs)),
      scrollReversals: Math.max(0, this.scrollReversals),
      idleMs: Math.max(0, Math.round(this.totalIdleMs)),
      wrongSubmissions: Math.max(0, this.wrongSubmissions),
      tabSwitches: Math.max(0, this.tabSwitches),
      activeMs: Math.max(0, Math.round(this.totalActiveMs)),
      windowStart: this.windowStartTime,
      windowEnd: end,
    };
  }

  public getIsIdle(): boolean {
    return this.isIdle;
  }

  public destroy(): void {
    if (this.tickIntervalId !== null) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }

    if (typeof window !== 'undefined') {
      ['keydown', 'mousedown', 'mousemove', 'touchstart'].forEach((evt) => {
        window.removeEventListener(evt, this.boundOnActivity);
      });
      window.removeEventListener('scroll', this.boundOnScroll);
      document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);
      window.removeEventListener('focus', this.boundOnFocus);
      window.removeEventListener('blur', this.boundOnBlur);
    }
  }
}
