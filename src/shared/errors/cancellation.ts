/**
 * Cancellation Sentinel & Control Flow Utilities
 * Represents expected, normal user or lifecycle cancellation without raising unhandled rejection errors.
 */

export type CancellationReason =
  | 'PREVIEW_CANCELLED'
  | 'TAB_SWITCHED'
  | 'SUPERSEDED'
  | 'PANEL_CLOSED'
  | 'USER_CANCELLED';

export class CancelledError extends Error {
  public readonly code = 'CANCELLED';
  public readonly isCancelled = true;
  public readonly reason: CancellationReason;

  constructor(reason: CancellationReason = 'USER_CANCELLED', message?: string) {
    super(message || reason);
    this.name = 'CancelledError';
    this.reason = reason;
    Object.setPrototypeOf(this, CancelledError.prototype);
  }
}

export function createCancelledError(
  reason: CancellationReason = 'USER_CANCELLED',
  message?: string
): CancelledError {
  return new CancelledError(reason, message);
}

/**
 * Returns true if the given value represents an expected cancellation or aborted operation.
 */
export function isCancellation(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof CancelledError) return true;
  if (typeof err === 'object') {
    const e = err as {
      name?: string;
      code?: string;
      message?: string;
      isCancelled?: boolean;
      reason?: string;
    };
    if (e.isCancelled === true) return true;
    if (e.name === 'CancelledError' || e.name === 'AbortError') return true;
    if (e.code === 'CANCELLED' || e.code === 'ABORTED') return true;
    if (
      e.reason === 'PREVIEW_CANCELLED' ||
      e.reason === 'TAB_SWITCHED' ||
      e.reason === 'SUPERSEDED' ||
      e.reason === 'PANEL_CLOSED' ||
      e.reason === 'USER_CANCELLED'
    ) {
      return true;
    }
    if (typeof e.message === 'string') {
      const msg = e.message.toUpperCase();
      if (
        msg.includes('PREVIEW_CANCELLED') ||
        msg.includes('TAB_SWITCHED') ||
        msg.includes('SUPERSEDED') ||
        msg.includes('PANEL_CLOSED') ||
        msg.includes('USER_CANCELLED') ||
        msg.includes('CANCELLED') ||
        msg.includes('ABORTED')
      ) {
        return true;
      }
    }
  }
  if (typeof err === 'string') {
    const s = err.toUpperCase();
    return (
      s.includes('PREVIEW_CANCELLED') ||
      s.includes('TAB_SWITCHED') ||
      s.includes('SUPERSEDED') ||
      s.includes('PANEL_CLOSED') ||
      s.includes('USER_CANCELLED') ||
      s.includes('CANCELLED') ||
      s.includes('ABORTED')
    );
  }
  return false;
}
