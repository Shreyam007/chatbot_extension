import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isContextInvalidatedError,
  sendToBackground,
  MessagingError,
} from '../../src/shared/messaging';

describe('Step 2: Lifecycle Resilience & Context Invalidation (EC-003)', () => {
  describe('isContextInvalidatedError helper', () => {
    it('detects standard Chrome context invalidated messages', () => {
      expect(isContextInvalidatedError(new Error('Extension context invalidated.'))).toBe(true);
      expect(isContextInvalidatedError(new Error('Could not establish connection. Receiving end does not exist.'))).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isContextInvalidatedError(new Error('Network timeout'))).toBe(false);
      expect(isContextInvalidatedError('not an error instance')).toBe(false);
      expect(isContextInvalidatedError(null)).toBe(false);
    });
  });

  describe('sendToBackground resilience', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('translates chrome.runtime.lastError context invalidation to friendly typed error', async () => {
      (global as unknown as { chrome: unknown }).chrome = {
        runtime: {
          lastError: { message: 'Extension context invalidated.' },
          sendMessage: vi.fn((_req, cb) => cb(undefined)),
        },
      };

      await expect(sendToBackground({ type: 'PING' })).rejects.toThrow(MessagingError);
      try {
        await sendToBackground({ type: 'PING' });
      } catch (err) {
        expect(err).toBeInstanceOf(MessagingError);
        expect((err as MessagingError).code).toBe('CONTEXT_INVALIDATED');
        expect((err as MessagingError).message).toContain('Please refresh the page');
      }
    });

    it('rejects with TIMEOUT if background service worker fails to respond within deadline', async () => {
      (global as unknown as { chrome: unknown }).chrome = {
        runtime: {
          lastError: undefined,
          sendMessage: vi.fn(() => {
            // never invokes callback to simulate hung/sleeping worker
          }),
        },
      };

      const promise = sendToBackground({ type: 'PING' }, 500);

      // Fast forward past timeout
      vi.advanceTimersByTime(600);

      await expect(promise).rejects.toThrow(MessagingError);
      try {
        await promise;
      } catch (err) {
        expect((err as MessagingError).code).toBe('TIMEOUT');
      }
    });
  });
});
