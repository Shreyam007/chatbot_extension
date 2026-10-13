import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingStateSchema, DEFAULT_ONBOARDING_STATE } from '../../src/shared/schemas/onboarding';
import { testGeminiApiKey } from '../../src/background/api-test';

describe('Step 3: Onboarding State & API Key Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OnboardingStateSchema & Defaults', () => {
    it('defaults to step 1, uncompleted, tracking OFF, and leetcode/codeforces enabled', () => {
      const parsed = OnboardingStateSchema.parse({});
      expect(parsed.currentStep).toBe(1);
      expect(parsed.completed).toBe(false);
      expect(parsed.trackingEnabled).toBe(false);
      expect(parsed.enabledSites).toEqual(['leetcode.com', 'codeforces.com']);
      expect(parsed.testStatus).toBe('idle');
    });

    it('validates partial state update transitions', () => {
      const updated = OnboardingStateSchema.parse({
        ...DEFAULT_ONBOARDING_STATE,
        currentStep: 2,
        trackingEnabled: true,
        apiKey: 'FAKE_TEST_KEY_NOT_REAL_ONBOARDING',
      });
      expect(updated.currentStep).toBe(2);
      expect(updated.trackingEnabled).toBe(true);
      expect(updated.apiKey).toBe('FAKE_TEST_KEY_NOT_REAL_ONBOARDING');
    });

    it('rejects invalid step numbers', () => {
      expect(() =>
        OnboardingStateSchema.parse({
          currentStep: 4,
        })
      ).toThrow();
    });
  });

  describe('testGeminiApiKey', () => {
    it('fails fast on empty key input without firing network request', async () => {
      const result = await testGeminiApiKey('   ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('succeeds for valid keys returning model listing', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'models/gemini-2.5-flash' }, { name: 'models/gemini-1.5-flash' }],
        }),
      });
      try {
        const result = await testGeminiApiKey('some_key_string_for_testing');
        expect(result.success).toBe(true);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(result.supportedModels).toContain('gemini-2.5-flash');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('rejects invalid keys with descriptive error from API response', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            status: 'PERMISSION_DENIED',
            message: 'API key not valid. Please pass a valid API key.',
          },
        }),
      });
      try {
        const result = await testGeminiApiKey('invalid_key_string_for_testing');
        expect(result.success).toBe(false);
        expect(result.error).toContain('PERMISSION_DENIED');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('handles simulated Google AI API response parsing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-2.5-flash' },
            { name: 'models/gemini-1.5-pro' },
          ],
        }),
      });
      globalThis.fetch = mockFetch;

      const result = await testGeminiApiKey('real_looking_valid_token_abc');
      expect(result.success).toBe(true);
      expect(result.supportedModels).toContain('gemini-2.5-flash');
    });

    it('handles Google AI API 403 error parsing without leaking key in error message', async () => {
      const sensitiveKey = 'FAKE_TEST_KEY_NOT_REAL_SENSITIVE';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          error: {
            status: 'PERMISSION_DENIED',
            message: 'API key not valid. Please pass a valid API key.',
          },
        }),
      });
      globalThis.fetch = mockFetch;

      const result = await testGeminiApiKey(sensitiveKey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('PERMISSION_DENIED');
      // Secret key must never leak into error message
      expect(result.error).not.toContain(sensitiveKey);
    });
  });
});
