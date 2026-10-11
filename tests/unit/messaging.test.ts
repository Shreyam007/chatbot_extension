import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BusRequestSchema,
  BusResponseEnvelopeSchema,
  registerBackgroundRouter,
} from '../../src/shared/messaging';

describe('Step 2: Typed Messaging Bus', () => {
  describe('BusRequestSchema Validation', () => {
    it('validates PING request', () => {
      expect(BusRequestSchema.safeParse({ type: 'PING' }).success).toBe(true);
    });

    it('validates GET_STATUS request', () => {
      expect(BusRequestSchema.safeParse({ type: 'GET_STATUS' }).success).toBe(true);
    });

    it('validates UPDATE_SETTINGS with partial settings', () => {
      const req = {
        type: 'UPDATE_SETTINGS',
        updates: { nudgeSensitivity: 'high' as const },
      };
      expect(BusRequestSchema.safeParse(req).success).toBe(true);
    });

    it('rejects unknown request types without throwing', () => {
      const res = BusRequestSchema.safeParse({ type: 'UNKNOWN_ACTION_OP' });
      expect(res.success).toBe(false);
    });

    it('rejects malformed payloads for known request types', () => {
      const res = BusRequestSchema.safeParse({
        type: 'UPDATE_SETTINGS',
        updates: { cooldownMin: -50 },
      });
      expect(res.success).toBe(false);
    });
  });

  describe('BusResponseEnvelopeSchema Validation', () => {
    it('accepts success envelope', () => {
      const envelope = { ok: true, data: { status: 'healthy' } };
      expect(BusResponseEnvelopeSchema.safeParse(envelope).success).toBe(true);
    });

    it('accepts error envelope', () => {
      const envelope = {
        ok: false,
        error: { code: 'TIMEOUT', message: 'Request exceeded deadline' },
      };
      expect(BusResponseEnvelopeSchema.safeParse(envelope).success).toBe(true);
    });
  });

  describe('Background Router Execution', () => {
    let mockListeners: Array<(msg: unknown, sender: unknown, sendResponse: (res: unknown) => void) => boolean>;

    beforeEach(() => {
      mockListeners = [];
      // Setup minimal chrome mock for testing
      (global as unknown as { chrome: unknown }).chrome = {
        runtime: {
          onMessage: {
            addListener: vi.fn((fn) => mockListeners.push(fn)),
            removeListener: vi.fn((fn) => {
              mockListeners = mockListeners.filter((l) => l !== fn);
            }),
          },
        },
      };
    });

    it('dispatches valid requests to registered handler', async () => {
      const pingHandler = vi.fn().mockResolvedValue({ status: 'PONG' });
      const cleanup = registerBackgroundRouter({ PING: pingHandler });

      expect(mockListeners.length).toBe(1);
      const listener = mockListeners[0]!;

      let responseSent: unknown = null;
      listener({ type: 'PING' }, {} as never, (res) => {
        responseSent = res;
      });

      // Allow promise ticks to settle
      await new Promise((r) => setTimeout(r, 10));

      expect(pingHandler).toHaveBeenCalled();
      expect(responseSent).toEqual({ ok: true, data: { status: 'PONG' } });

      cleanup();
    });

    it('rejects invalid or unknown messages with error envelope without throwing', async () => {
      const cleanup = registerBackgroundRouter({ PING: vi.fn() });
      const listener = mockListeners[0]!;

      let responseSent: unknown = null;
      listener({ type: 'BAD_TYPE' }, {} as never, (res) => {
        responseSent = res;
      });

      expect(responseSent).toEqual({
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message did not match bus contract schema',
        },
      });

      cleanup();
    });

    it('handles handler exceptions gracefully without crashing UI', async () => {
      const cleanup = registerBackgroundRouter({
        PING: () => {
          throw new Error('Database lookup failed');
        },
      });
      const listener = mockListeners[0]!;

      let responseSent: unknown = null;
      listener({ type: 'PING' }, {} as never, (res) => {
        responseSent = res;
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(responseSent).toEqual({
        ok: false,
        error: {
          code: 'HANDLER_ERROR',
          message: 'Database lookup failed',
        },
      });

      cleanup();
    });
  });
});
