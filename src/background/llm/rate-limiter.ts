import { createLogger } from '../../shared/logger';

const logger = createLogger('RateLimiter');

export interface RateLimiterConfig {
  maxTokens: number; // e.g. 10 tokens capacity
  refillIntervalMs: number; // e.g. 60,000 ms
}

export class TokenBucketRateLimiter {
  private maxTokens: number;
  private refillIntervalMs: number;
  private tokens: number;
  private lastRefillTimestamp: number;
  private queue: Array<{
    resolve: (ok: boolean) => void;
    reject: (err: Error) => void;
    enqueuedAt: number;
    timeoutTimer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.maxTokens = config.maxTokens ?? 10; // 10 RPM conservative for free-tier 15 RPM limit
    this.refillIntervalMs = config.refillIntervalMs ?? 60_000;
    this.tokens = this.maxTokens;
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Refills tokens based on elapsed time since last refill
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTimestamp;
    if (elapsed <= 0) return;

    const refillTokens = (elapsed / this.refillIntervalMs) * this.maxTokens;
    if (refillTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + refillTokens);
      this.lastRefillTimestamp = now;
    }
  }

  /**
   * Waits for an available token before firing network request to Google AI.
   * Prevents burst requests from hitting HTTP 429 RESOURCE_EXHAUSTED.
   */
  public async acquireToken(timeoutMs = 30_000): Promise<boolean> {
    this.refill();

    // If a token is immediately available and no queue is pending
    if (this.tokens >= 1 && this.queue.length === 0) {
      this.tokens -= 1;
      return true;
    }

    // Otherwise, enqueue and wait for next token refill
    logger.debug(`Tokens exhausted (${this.tokens.toFixed(2)}/${this.maxTokens}). Enqueuing request.`);
    return new Promise<boolean>((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        // Remove from queue on timeout
        this.queue = this.queue.filter((item) => item.timeoutTimer !== timeoutTimer);
        reject(new Error(`Rate limiter queue timeout exceeded (${timeoutMs}ms)`));
      }, timeoutMs);

      this.queue.push({
        resolve,
        reject,
        enqueuedAt: Date.now(),
        timeoutTimer,
      });

      this.scheduleNextDrain();
    });
  }

  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleNextDrain(): void {
    if (this.drainTimer !== null || this.queue.length === 0) return;

    this.refill();
    if (this.tokens >= 1) {
      this.drainQueue();
      return;
    }

    // Time until 1 token is refilled
    const tokensNeeded = 1 - this.tokens;
    const waitMs = Math.ceil((tokensNeeded / this.maxTokens) * this.refillIntervalMs);

    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      this.drainQueue();
    }, Math.max(100, waitMs));
  }

  private drainQueue(): void {
    this.refill();

    while (this.queue.length > 0 && this.tokens >= 1) {
      const next = this.queue.shift();
      if (next) {
        clearTimeout(next.timeoutTimer);
        this.tokens -= 1;
        next.resolve(true);
      }
    }

    if (this.queue.length > 0) {
      this.scheduleNextDrain();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  public getEstimatedWaitMs(): number {
    this.refill();
    if (this.tokens >= 1 && this.queue.length === 0) return 0;
    const tokensNeeded = (this.queue.length + 1) - this.tokens;
    return Math.max(0, Math.ceil((tokensNeeded / this.maxTokens) * this.refillIntervalMs));
  }

  public reset(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        clearTimeout(item.timeoutTimer);
        item.resolve(true);
      }
    }
    this.tokens = this.maxTokens;
    this.lastRefillTimestamp = Date.now();
  }
}

export const globalRateLimiter = new TokenBucketRateLimiter();
