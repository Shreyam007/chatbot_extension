import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeOriginPattern,
  requestSitePermission,
  hasSitePermission,
  removeSitePermission,
  registerOriginContentScript,
  unregisterOriginContentScript,
  executeScriptOnTabOnce,
  extractOriginFromUrl,
  getScriptIdForOrigin,
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

  describe('extractOriginFromUrl & getScriptIdForOrigin', () => {
    it('extracts origin correctly from URL string', () => {
      expect(extractOriginFromUrl('https://en.wikipedia.org/wiki/Binary_search')).toBe('https://en.wikipedia.org');
      expect(extractOriginFromUrl('http://localhost:3000/app')).toBe('http://localhost:3000');
      expect(extractOriginFromUrl('invalid-url')).toBe('invalid-url');
    });

    it('generates consistent sanitized script ID for origin pattern', () => {
      const id1 = getScriptIdForOrigin('https://en.wikipedia.org/*');
      const id2 = getScriptIdForOrigin('https://en.wikipedia.org/*');
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^unstuck-[a-zA-Z0-9_-]+$/);
    });
  });

  describe('registerOriginContentScript & unregisterOriginContentScript', () => {
    it('registers dynamic content script when scripting API is available', async () => {
      const mockRegister = vi.fn().mockResolvedValue(undefined);
      const mockUnregister = vi.fn().mockResolvedValue(undefined);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        scripting: {
          registerContentScripts: mockRegister,
          unregisterContentScripts: mockUnregister,
        },
      };

      const success = await registerOriginContentScript('https://en.wikipedia.org/*');
      expect(success).toBe(true);
      expect(mockUnregister).toHaveBeenCalled();
      expect(mockRegister).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            matches: ['https://en.wikipedia.org/*'],
            js: ['content-scripts/content.js'],
          }),
        ])
      );
    });

    it('unregisters dynamic content script correctly', async () => {
      const mockUnregister = vi.fn().mockResolvedValue(undefined);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        scripting: {
          unregisterContentScripts: mockUnregister,
        },
      };

      const success = await unregisterOriginContentScript('https://en.wikipedia.org/*');
      expect(success).toBe(true);
      expect(mockUnregister).toHaveBeenCalled();
    });
  });

  describe('executeScriptOnTabOnce', () => {
    it('executes content script file on target tab', async () => {
      const mockExecute = vi.fn().mockResolvedValue([{ result: true }]);
      (globalThis as unknown as { chrome: unknown }).chrome = {
        scripting: {
          executeScript: mockExecute,
        },
      };

      const success = await executeScriptOnTabOnce(123);
      expect(success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith({
        target: { tabId: 123 },
        files: ['content-scripts/content.js'],
      });
    });

    it('returns false when executeScript fails', async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error('Cannot access tab'));
      (globalThis as unknown as { chrome: unknown }).chrome = {
        scripting: {
          executeScript: mockExecute,
        },
      };

      const success = await executeScriptOnTabOnce(999);
      expect(success).toBe(false);
    });
  });
});
