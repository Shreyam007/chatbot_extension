import { DEFAULT_AI_MODEL, LIMITS } from '../../shared/config';
import { createLogger } from '../../shared/logger';
import { LlmError, parseHttpError } from './errors';
import { globalRateLimiter } from './rate-limiter';
import type {
  LlmGenerationOptions,
  LlmResponse,
  TokenUsage,
  GeminiApiResponse,
} from './types';

const logger = createLogger('GeminiClient');

export class GeminiClient {
  private static inFlightByHash = new Map<string, Promise<LlmResponse<unknown>>>();
  private static abortControllersByTab = new Map<number, AbortController>();
  private static abortControllersByRequestId = new Map<string, AbortController>();

  constructor(private readonly explicitApiKey?: string) {}

  /**
   * Resolves the active Gemini API key from explicit instance param or chrome.storage.local
   */
  private async getApiKey(): Promise<string> {
    if (this.explicitApiKey && this.explicitApiKey.trim().length > 0) {
      return this.explicitApiKey.trim();
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get(['apiKey']);
        if (stored?.apiKey && typeof stored.apiKey === 'string') {
          return stored.apiKey.trim();
        }
      }
    } catch (err) {
      logger.warn('Failed to retrieve API key from chrome.storage.local', err);
    }

    return '';
  }

  /**
   * Generates a stable collision-resistant hash for request coalescing (EC-087 / Task E.3)
   */
  private static createRequestHash(prompt: string, options: LlmGenerationOptions): string {
    const tab = options.tabId ?? 0;
    const model = options.model || DEFAULT_AI_MODEL;
    const schema = options.responseSchema ? JSON.stringify(options.responseSchema) : '';
    return `${tab}::${model}::${prompt.length}::${prompt.slice(0, 100)}::${schema}`;
  }

  /**
   * Aborts any in-flight generation request for the given tab ID (EC-086)
   */
  public static cancelTabRequest(tabId: number): boolean {
    return this.cancelRequest({ tabId });
  }

  /**
   * Aborts any in-flight generation request by tab ID or requestId
   */
  public static cancelRequest(ids: { tabId?: number; requestId?: string }): boolean {
    let cancelled = false;
    if (ids.tabId !== undefined) {
      const controller = this.abortControllersByTab.get(ids.tabId);
      if (controller) {
        controller.abort();
        this.abortControllersByTab.delete(ids.tabId);
        logger.debug(`Aborted in-flight LLM request for tab ${ids.tabId}`);
        cancelled = true;
      }
    }
    if (ids.requestId) {
      const controller = this.abortControllersByRequestId.get(ids.requestId);
      if (controller) {
        controller.abort();
        this.abortControllersByRequestId.delete(ids.requestId);
        logger.debug(`Aborted in-flight LLM request for requestId ${ids.requestId}`);
        cancelled = true;
      }
    }
    return cancelled;
  }

  /**
   * Resets all in-flight tracking state (useful for tests or teardown)
   */
  public static resetState(): void {
    this.inFlightByHash.clear();
    this.abortControllersByTab.clear();
    this.abortControllersByRequestId.clear();
  }

  /**
   * Generates structured JSON output from Gemini with schema enforcement, retries,
   * single-shot repair, and duplicate coalescing by full request hash.
   */
  public async generateJson<T = unknown>(
    prompt: string,
    options: LlmGenerationOptions = {}
  ): Promise<LlmResponse<T>> {
    const requestHash = GeminiClient.createRequestHash(prompt, options);

    // In-flight coalescing by full request hash (F7 & Task E.3)
    if (GeminiClient.inFlightByHash.has(requestHash)) {
      logger.debug(`Coalescing duplicate in-flight LLM request (hash=${requestHash.slice(0, 40)}...)`);
      return GeminiClient.inFlightByHash.get(requestHash)! as Promise<LlmResponse<T>>;
    }

    const executionPromise = this.executeGenerationWithRetry<T>(prompt, options);
    GeminiClient.inFlightByHash.set(requestHash, executionPromise as Promise<LlmResponse<unknown>>);

    void executionPromise
      .catch(() => {})
      .finally(() => {
        GeminiClient.inFlightByHash.delete(requestHash);
        if (options.tabId !== undefined) {
          GeminiClient.abortControllersByTab.delete(options.tabId);
        }
        if (options.requestId) {
          GeminiClient.abortControllersByRequestId.delete(options.requestId);
        }
      });

    return executionPromise;
  }

  private async executeGenerationWithRetry<T>(
    prompt: string,
    options: LlmGenerationOptions
  ): Promise<LlmResponse<T>> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new LlmError('NO_KEY', 'No API key configured. Please set your Gemini API key in settings.', {
        status: 401,
      });
    }

    const maxRetries = options.maxRetries ?? LIMITS.MAX_LLM_RETRIES;
    let attempt = 0;
    let currentOptions = { ...options };

    while (attempt <= maxRetries) {
      try {
        return await this.callApiOnce<T>(prompt, apiKey, currentOptions);
      } catch (err) {
        attempt++;

        if (err instanceof LlmError) {
          // Task E.2: Handle TRUNCATED_OUTPUT by retrying once with larger maxOutputTokens (4096)
          if (err.code === 'TRUNCATED_OUTPUT' && (currentOptions.maxOutputTokens ?? 2048) < 4096 && attempt <= 1) {
            logger.warn('Output truncated by MAX_TOKENS; retrying once with 4096 tokens budget (Task E.2)');
            currentOptions = { ...currentOptions, maxOutputTokens: 4096 };
            continue;
          }

          // If aborted by user, non-retryable error, or rate-limited without retry permission, throw immediately
          if (
            err.code === 'ABORTED' ||
            err.code === 'RATE_LIMITED' ||
            !err.isRetryable ||
            attempt > maxRetries
          ) {
            throw err;
          }

          const backoffDelay =
            currentOptions._retryDelayMs !== undefined
              ? currentOptions._retryDelayMs
              : err.retryAfterSeconds
              ? err.retryAfterSeconds * 1000
              : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 10000);

          logger.warn(
            `LLM call attempt ${attempt} failed with ${err.code}. Retrying in ${Math.round(backoffDelay)}ms...`
          );

          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          throw err;
        }
      }
    }

    throw new LlmError('SERVER_ERROR', 'Maximum LLM retry attempts exceeded.');
  }

  private async callApiOnce<T>(
    prompt: string,
    apiKey: string,
    options: LlmGenerationOptions
  ): Promise<LlmResponse<T>> {
    const model = options.model || DEFAULT_AI_MODEL;
    const timeoutMs = options.timeoutMs ?? LIMITS.NETWORK_TIMEOUT_MS;
    const temperature = options.temperature ?? 0.2;
    const maxOutputTokens = options.maxOutputTokens ?? 2048;

    // Check offline status before making fetch (EC-081)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new LlmError('OFFLINE', 'Network connection unavailable.');
    }

    // Task E.3: Acquire rate limiter token from token bucket before firing network request
    try {
      await globalRateLimiter.acquireToken(Math.min(timeoutMs, 25_000));
    } catch {
      throw new LlmError('RATE_LIMITED', 'Client rate limiter paced request to prevent quota exhaustion.', {
        retryAfterSeconds: 10,
        quotaKind: 'per_minute',
        isEstimate: true,
      });
    }

    const controller = new AbortController();
    if (options.tabId !== undefined) {
      GeminiClient.abortControllersByTab.set(options.tabId, controller);
    }
    if (options.requestId) {
      GeminiClient.abortControllersByRequestId.set(options.requestId, controller);
    }

    // Connect caller's abort signal if supplied
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    let isTimedOut = false;
    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, timeoutMs);

    const startTime = Date.now();

    // Prepare Gemini generationConfig with structured JSON schema
    const generationConfig: Record<string, unknown> = {
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
    };

    // Task E.2 & Finding F5: Disable thinking tokens for Flash-class models to prevent output blowout
    if (model.toLowerCase().includes('flash')) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    if (options.responseSchema) {
      generationConfig.responseSchema = options.responseSchema;
    }

    const requestBody: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    };

    if (options.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }],
      };
    }

    // Task E.6: Header authentication - API key is NEVER passed in the URL query string
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    logger.debug(`Calling Gemini model: ${model} (timeout: ${timeoutMs}ms)`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);

      if (isTimedOut) {
        throw new LlmError('TIMEOUT', `Request timed out after ${timeoutMs}ms.`);
      }

      if (controller.signal.aborted) {
        throw new LlmError('ABORTED', 'Request cancelled by user.');
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        throw new LlmError('OFFLINE', 'Network request failed. Check your internet connection.');
      }

      throw new LlmError('SERVER_ERROR', `Network error: ${errMsg}`, { cause: err });
    } finally {
      clearTimeout(timeoutTimer);
      if (options.requestId) {
        GeminiClient.abortControllersByRequestId.delete(options.requestId);
      }
      if (options.tabId !== undefined) {
        GeminiClient.abortControllersByTab.delete(options.tabId);
      }
    }

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      let errorData: Record<string, unknown> | undefined;
      try {
        errorData = (await response.json()) as Record<string, unknown>;
      } catch {
        // Response was not JSON
      }
      throw parseHttpError(response.status, response.statusText, errorData, response.headers, model);
    }

    let rawData: GeminiApiResponse;
    try {
      rawData = (await response.json()) as GeminiApiResponse;
    } catch (err) {
      throw new LlmError('SERVER_ERROR', 'Failed to parse response body from Gemini API.', { cause: err });
    }

    // Check Safety Blocks (EC-085)
    if (rawData.promptFeedback?.blockReason === 'SAFETY') {
      throw new LlmError('SAFETY_BLOCKED', 'Prompt was blocked by Google AI safety filters.', { model });
    }

    const candidate = rawData.candidates?.[0];
    if (!candidate) {
      throw new LlmError('SAFETY_BLOCKED', 'Model returned an empty candidate list.', { model });
    }

    if (candidate.finishReason === 'SAFETY') {
      throw new LlmError('SAFETY_BLOCKED', 'Candidate generation was blocked by Google AI safety filters.', { model });
    }

    const rawText = candidate.content?.parts?.[0]?.text || '';
    if (!rawText.trim()) {
      if (candidate.finishReason === 'MAX_TOKENS') {
        throw new LlmError('TRUNCATED_OUTPUT', 'Model response reached MAX_TOKENS with empty output.', { model });
      }
      throw new LlmError('SAFETY_BLOCKED', 'Model generated an empty text response.', { model });
    }

    if (candidate.finishReason === 'MAX_TOKENS') {
      try {
        const parsed = this.cleanAndParseJson<T>(rawText);
        const usage: TokenUsage = {
          promptTokens: rawData.usageMetadata?.promptTokenCount ?? 0,
          candidateTokens: rawData.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: rawData.usageMetadata?.totalTokenCount ?? 0,
        };
        return { data: parsed, rawText, usage, latencyMs, model };
      } catch {
        throw new LlmError('TRUNCATED_OUTPUT', 'Model response was truncated by MAX_TOKENS and could not be parsed as valid JSON.', { model });
      }
    }

    const usage: TokenUsage = {
      promptTokens: rawData.usageMetadata?.promptTokenCount ?? 0,
      candidateTokens: rawData.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: rawData.usageMetadata?.totalTokenCount ?? 0,
    };

    // Attempt JSON parsing with single-shot repair fallback (EC-084)
    const parsedData = await this.parseOrRepairJson<T>(rawText, apiKey, options);

    return {
      data: parsedData,
      rawText,
      usage,
      latencyMs,
      model,
    };
  }

  /**
   * Tries to parse the model output as JSON. If it fails, attempts a single-shot repair request (EC-084).
   * Handled with timeout, abort signal, and secure header authentication.
   */
  private async parseOrRepairJson<T>(
    rawText: string,
    apiKey: string,
    options: LlmGenerationOptions
  ): Promise<T> {
    try {
      return this.cleanAndParseJson<T>(rawText);
    } catch (parseError) {
      logger.warn('Initial JSON parsing failed. Attempting single-shot repair (EC-084)...', parseError);

      try {
        const repairPrompt =
          `The following text was expected to be valid JSON matching the schema, but failed parsing:\n\n` +
          `\`\`\`\n${rawText.slice(0, 3000)}\n\`\`\`\n\n` +
          `Please fix all syntax errors and return ONLY valid, well-formed JSON. Do not include explanation text.`;

        const repairModel = options.model || DEFAULT_AI_MODEL;
        const repairUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(repairModel)}:generateContent`;

        const repairController = new AbortController();
        const repairTimeout = setTimeout(() => repairController.abort(), 10_000);

        const repairResponse = await fetch(repairUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              ...(repairModel.toLowerCase().includes('flash')
                ? { thinkingConfig: { thinkingBudget: 0 } }
                : {}),
            },
          }),
          signal: repairController.signal,
        });

        clearTimeout(repairTimeout);

        if (repairResponse.ok) {
          const repairData = (await repairResponse.json()) as GeminiApiResponse;
          const repairedText = repairData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (repairedText.trim()) {
            const repairedResult = this.cleanAndParseJson<T>(repairedText);
            logger.info('JSON single-shot repair succeeded (EC-084)');
            return repairedResult;
          }
        }
      } catch (repairErr) {
        logger.warn('JSON repair attempt failed', repairErr);
      }

      throw new LlmError('MALFORMED_JSON', 'Model returned malformed JSON that could not be repaired.');
    }
  }

  /**
   * Sanitizes markdown code fences and parses JSON string
   */
  private cleanAndParseJson<T>(text: string): T {
    let cleaned = text.trim();

    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      const match = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (match && match[1]) {
        cleaned = match[1].trim();
      }
    }

    return JSON.parse(cleaned) as T;
  }
}
