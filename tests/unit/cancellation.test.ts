// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CancelledError,
  isCancellation,
  createCancelledError,
  type CancellationReason,
} from '../../src/shared/errors/cancellation';
import { installGlobalErrorHandlers, getRecentErrors, clearRecentErrors } from '../../src/shared/errors/reporter';

describe('Cancellation Sentinel and Classification (EC-152)', () => {
  it('instantiates CancelledError with correct properties', () => {
    const reasons: CancellationReason[] = [
      'PREVIEW_CANCELLED',
      'TAB_SWITCHED',
      'SUPERSEDED',
      'PANEL_CLOSED',
      'USER_CANCELLED',
    ];

    for (const reason of reasons) {
      const err = new CancelledError(reason);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CancelledError);
      expect(err.name).toBe('CancelledError');
      expect(err.reason).toBe(reason);
      expect(err.code).toBe('CANCELLED');
      expect(err.isCancelled).toBe(true);
      expect(err.message).toBe(reason);
    }
  });

  it('createCancelledError factory creates CancelledError', () => {
    const err = createCancelledError('TAB_SWITCHED');
    expect(err).toBeInstanceOf(CancelledError);
    expect(err.reason).toBe('TAB_SWITCHED');
  });

  describe('isCancellation predicate', () => {
    it('identifies CancelledError instances', () => {
      expect(isCancellation(new CancelledError('PREVIEW_CANCELLED'))).toBe(true);
      expect(isCancellation(new CancelledError('SUPERSEDED'))).toBe(true);
    });

    it('identifies standard Errors with cancellation messages', () => {
      expect(isCancellation(new Error('PREVIEW_CANCELLED'))).toBe(true);
      expect(isCancellation(new Error('TAB_SWITCHED'))).toBe(true);
      expect(isCancellation(new Error('SUPERSEDED'))).toBe(true);
      expect(isCancellation(new Error('PANEL_CLOSED'))).toBe(true);
      expect(isCancellation(new Error('USER_CANCELLED'))).toBe(true);
    });

    it('identifies AbortError by name or message', () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      expect(isCancellation(abortErr)).toBe(true);

      expect(isCancellation(new Error('Request aborted'))).toBe(true);
      expect(isCancellation(new Error('Action was aborted'))).toBe(true);
    });

    it('identifies structural cancellation objects', () => {
      expect(isCancellation({ isCancelled: true })).toBe(true);
      expect(isCancellation({ code: 'CANCELLED' })).toBe(true);
      expect(isCancellation({ reason: 'PREVIEW_CANCELLED' })).toBe(true);
      expect(isCancellation('PREVIEW_CANCELLED')).toBe(true);
      expect(isCancellation('TAB_SWITCHED')).toBe(true);
    });

    it('rejects normal errors and non-cancellations', () => {
      expect(isCancellation(new Error('NETWORK_FAILED'))).toBe(false);
      expect(isCancellation(new Error('Failed to fetch'))).toBe(false);
      expect(isCancellation(new TypeError('Cannot read properties of undefined'))).toBe(false);
      expect(isCancellation(null)).toBe(false);
      expect(isCancellation(undefined)).toBe(false);
      expect(isCancellation({})).toBe(false);
      expect(isCancellation(42)).toBe(false);
      expect(isCancellation('Some unexpected error')).toBe(false);
    });
  });
});

describe('Global Error Handler Cancellation Suppression', () => {
  beforeEach(async () => {
    await clearRecentErrors();
  });

  afterEach(async () => {
    await clearRecentErrors();
  });

  it('calls preventDefault() and suppresses recordError for cancellation rejections', async () => {
    const uninstall = installGlobalErrorHandlers('sidepanel');

    let preventDefaultCalled = false;
    const evt = new Event('unhandledrejection') as unknown as {
      reason: unknown;
      preventDefault: () => void;
    };
    evt.reason = new CancelledError('PREVIEW_CANCELLED');
    evt.preventDefault = () => {
      preventDefaultCalled = true;
    };

    window.dispatchEvent(evt as unknown as Event);

    expect(preventDefaultCalled).toBe(true);

    const recent = await getRecentErrors();
    expect(recent.length).toBe(0);

    uninstall();
  });

  it('records normal unhandled rejections to recent_errors', async () => {
    const uninstall = installGlobalErrorHandlers('sidepanel');

    let preventDefaultCalled = false;
    const evt = new Event('unhandledrejection') as unknown as {
      reason: unknown;
      preventDefault: () => void;
    };
    evt.reason = new Error('UNEXPECTED_CRASH_TEST');
    evt.preventDefault = () => {
      preventDefaultCalled = true;
    };

    window.dispatchEvent(evt as unknown as Event);

    expect(preventDefaultCalled).toBe(false);

    const recent = await getRecentErrors();
    expect(recent.some((e) => e.message.includes('UNEXPECTED_CRASH_TEST'))).toBe(true);

    uninstall();
  });
});
