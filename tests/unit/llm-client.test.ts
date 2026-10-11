import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiClient, LlmError, mapCodeToS13Screen } from '../../src/background/llm';

describe('GeminiClient & Error Mapping (Step 8)', () => {
  const TEST_API_KEY = 'AIzaSy_fake_test_key_1234567890abcdef';
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('generates structured JSON output with token usage and latency', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ hint: 'Think about two pointers', level: 1 }) }],
            role: 'model',
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 50,
        candidatesTokenCount: 25,
        totalTokenCount: 75,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    } as unknown as Response);

    const client = new GeminiClient(TEST_API_KEY);
    const result = await client.generateJson<{ hint: string; level: number }>(
      'Give me a hint for two sum',
      { model: 'gemini-2.5-flash', temperature: 0.2 }
    );

    expect(result.data).toEqual({ hint: 'Think about two pointers', level: 1 });
    expect(result.usage.promptTokens).toBe(50);
    expect(result.usage.candidateTokens).toBe(25);
    expect(result.usage.totalTokens).toBe(75);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.model).toBe('gemini-2.5-flash');
  });

  it('throws NO_KEY when API key is missing or blank', async () => {
    const client = new GeminiClient('');
    try {
      await client.generateJson('hello');
      expect.fail('Expected to throw NO_KEY');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('NO_KEY');
      expect(llmErr.s13Screen).toBe('S13.1');
    }
  });

  it('throws INVALID_KEY on HTTP 403 or permission denied (S13.1)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
      json: async () => ({
        error: { message: 'API key not valid. Please pass a valid API key.' },
      }),
    } as unknown as Response);

    const client = new GeminiClient(TEST_API_KEY);
    try {
      await client.generateJson('hello');
      expect.fail('Expected to throw INVALID_KEY');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('INVALID_KEY');
      expect(llmErr.s13Screen).toBe('S13.1');
    }
  });

  it('throws OFFLINE when network fetch fails (S13.2)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const client = new GeminiClient(TEST_API_KEY);
    try {
      await client.generateJson('hello', { timeoutMs: 1000, maxRetries: 0 });
      expect.fail('Expected to throw OFFLINE');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('OFFLINE');
      expect(llmErr.s13Screen).toBe('S13.2');
    }
  });

  it('throws RATE_LIMITED on HTTP 429 and parses Retry-After header (S13.3)', async () => {
    const headers = new Headers();
    headers.set('retry-after', '45');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers,
      json: async () => ({
        error: { message: 'Resource has been exhausted (e.g. check quota).' },
      }),
    } as unknown as Response);

    const client = new GeminiClient(TEST_API_KEY);
    try {
      await client.generateJson('hello');
      expect.fail('Expected to throw RATE_LIMITED');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('RATE_LIMITED');
      expect(llmErr.s13Screen).toBe('S13.3');
      expect(llmErr.retryAfterSeconds).toBe(45);
    }
  });

  it('retries on HTTP 500 server error and throws SERVER_ERROR when exhausted (S13.4)', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers(),
        json: async () => ({ error: { message: 'Overloaded' } }),
      } as unknown as Response;
    });

    const client = new GeminiClient(TEST_API_KEY);
    try {
      await client.generateJson('hello', { _retryDelayMs: 0 });
      expect.fail('Expected to throw SERVER_ERROR');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('SERVER_ERROR');
      expect(llmErr.s13Screen).toBe('S13.4');
      expect(callCount).toBe(4); // 1 initial + 3 retries
    }
  });

  it('throws TIMEOUT when request exceeds configured duration (S13.4)', async () => {
    global.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        }
      });
    });

    const client = new GeminiClient(TEST_API_KEY);
    try {
      // 50ms short timeout for test
      await client.generateJson('hello', { timeoutMs: 50, maxRetries: 0 });
      expect.fail('Expected to throw TIMEOUT');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('TIMEOUT');
      expect(llmErr.s13Screen).toBe('S13.4');
    }
  });

  it('throws SAFETY_BLOCKED when Gemini flags content safety (EC-085)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            finishReason: 'SAFETY',
            safetyRatings: [{ category: 'HARM_CATEGORY_DANGEROUS', probability: 'HIGH' }],
          },
        ],
      }),
    } as unknown as Response);

    const client = new GeminiClient(TEST_API_KEY);
    try {
      await client.generateJson('dangerous query');
      expect.fail('Expected to throw SAFETY_BLOCKED');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('SAFETY_BLOCKED');
      expect(llmErr.s13Screen).toBe('S13.5');
    }
  });

  it('successfully repairs malformed JSON with single-shot repair (EC-084)', async () => {
    let callIndex = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callIndex++;
      if (callIndex === 1) {
        // Initial call returns broken JSON
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: { parts: [{ text: '{ "brokenJson": true, unclosed ' }] },
                finishReason: 'STOP',
              },
            ],
          }),
        } as unknown as Response;
      }
      // Second call (repair attempt) returns clean valid JSON
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: '{"repaired": true, "code": "valid"}' }] },
              finishReason: 'STOP',
            },
          ],
        }),
      } as unknown as Response;
    });

    const client = new GeminiClient(TEST_API_KEY);
    const result = await client.generateJson<{ repaired: boolean; code: string }>('test prompt');

    expect(callIndex).toBe(2);
    expect(result.data).toEqual({ repaired: true, code: 'valid' });
  });

  it('throws MALFORMED_JSON when repair also fails (EC-084)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: { parts: [{ text: 'NOT VALID JSON AT ALL' }] },
            finishReason: 'STOP',
          },
        ],
      }),
    } as unknown as Response);

    const client = new GeminiClient(TEST_API_KEY);
    try {
      await client.generateJson('test prompt');
      expect.fail('Expected to throw MALFORMED_JSON');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('MALFORMED_JSON');
    }
  });

  it('aborts cleanly when user cancels generation (EC-086)', async () => {
    const controller = new AbortController();

    global.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
      });
    });

    const client = new GeminiClient(TEST_API_KEY);
    const promise = client.generateJson('hello', { signal: controller.signal });

    // User cancels after 10ms
    setTimeout(() => controller.abort(), 10);

    try {
      await promise;
      expect.fail('Expected to throw ABORTED');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      const llmErr = err as LlmError;
      expect(llmErr.code).toBe('ABORTED');
    }
  });

  it('coalesces duplicate requests for the same tab ID (EC-087)', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify({ coalesced: true }) }] },
              finishReason: 'STOP',
            },
          ],
        }),
      } as unknown as Response;
    });

    const client = new GeminiClient(TEST_API_KEY);
    const tabId = 42;

    // Fire two identical tab requests concurrently
    const [res1, res2] = await Promise.all([
      client.generateJson<{ coalesced: boolean }>('prompt 1', { tabId }),
      client.generateJson<{ coalesced: boolean }>('prompt 1 duplicate', { tabId }),
    ]);

    expect(callCount).toBe(1);
    expect(res1.data).toEqual({ coalesced: true });
    expect(res2.data).toEqual({ coalesced: true });
  });

  it('strictly redacts API keys from error messages, ensuring zero leakage (Rule 4)', async () => {
    const secretKey = 'AIzaSySecretApiKeyThatMustNeverLeak12345';
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers(),
      json: async () => ({
        error: {
          message: `Invalid key provided: ${secretKey} was rejected by server.`,
        },
      }),
    } as unknown as Response);

    const client = new GeminiClient(secretKey);
    try {
      await client.generateJson('prompt');
      expect.fail('Expected to throw');
    } catch (err) {
      const errMessage = (err as Error).message;
      expect(errMessage).not.toContain(secretKey);
      expect(errMessage).toContain('[REDACTED_API_KEY]');
    }
  });

  it('maps all error codes to expected S13/S14 screens', () => {
    expect(mapCodeToS13Screen('NO_KEY')).toBe('S13.1');
    expect(mapCodeToS13Screen('INVALID_KEY')).toBe('S13.1');
    expect(mapCodeToS13Screen('OFFLINE')).toBe('S13.2');
    expect(mapCodeToS13Screen('RATE_LIMITED')).toBe('S13.3');
    expect(mapCodeToS13Screen('TIMEOUT')).toBe('S13.4');
    expect(mapCodeToS13Screen('SERVER_ERROR')).toBe('S13.4');
    expect(mapCodeToS13Screen('MALFORMED_JSON')).toBe('S13.4');
    expect(mapCodeToS13Screen('SAFETY_BLOCKED')).toBe('S13.5');
    expect(mapCodeToS13Screen('ABORTED')).toBe('NONE');
  });
});
