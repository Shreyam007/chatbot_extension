import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeOriginPattern,
  requestSitePermission,
  hasSitePermission,
  removeSitePermission
} from '../../src/shared/permissions';

describe('Step 3: Permissions & Site Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeOriginPattern', () => {
    it('formats plain domain into valid Chrome match pattern', () => {
      expect(normalizeOriginPattern('leetcode.com')).toBe('https://leetcode.com/*');
      expect(normalizeOriginPattern('codeforces.com')).toBe('https://codeforces.com/*');
    });

    it('preserves existing https prefix and appends wildcard path', () => {
      expect(normalizeOriginPattern('https://atcoder.jp')).toBe('https://atcoder.jp/*');
      expect(normalizeOriginPattern('https://atcoder.jp/')).toBe('https://atcoder.jp/*');
      expect(normalizeOriginPattern('https://atcoder.jp/*')).toBe('https://atcoder.jp/*');
    });

    it('handles http prefix appropriately', () => {
      expect(normalizeOriginPattern('http://localhost:3000')).toBe('http://localhost:3000/*');
    });
  });

  describe('requestSitePermission', () => {
    it('requests origin permission through chrome.permissions.request when available', async () => {
      const mockRequest = vi.fn().mockResolvedValue(true);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        permissions: {
          request: mockRequest,
          contains: vi.fn(),
          remove: vi.fn(),
        },
      };

      const result = await requestSitePermission('leetcode.com');
      expect(result).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith({
        origins: ['https://leetcode.com/*'],
      });
    });

    it('returns false gracefully when permission is denied by the user', async () => {
      const mockRequest = vi.fn().mockResolvedValue(false);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        permissions: {
          request: mockRequest,
          contains: vi.fn(),
          remove: vi.fn(),
        },
      };

      const result = await requestSitePermission('codeforces.com');
      expect(result).toBe(false);
    });
  });

  describe('hasSitePermission', () => {
    it('checks origin contains through chrome.permissions.contains', async () => {
      const mockContains = vi.fn().mockResolvedValue(true);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        permissions: {
          request: vi.fn(),
          contains: mockContains,
          remove: vi.fn(),
        },
      };

      const has = await hasSitePermission('leetcode.com');
      expect(has).toBe(true);
      expect(mockContains).toHaveBeenCalledWith({
        origins: ['https://leetcode.com/*'],
      });
    });
  });

  describe('removeSitePermission', () => {
    it('removes origin via chrome.permissions.remove', async () => {
      const mockRemove = vi.fn().mockResolvedValue(true);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        permissions: {
          request: vi.fn(),
          contains: vi.fn(),
          remove: mockRemove,
        },
      };

      const removed = await removeSitePermission('leetcode.com');
      expect(removed).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith({
        origins: ['https://leetcode.com/*'],
      });
    });
  });
});
