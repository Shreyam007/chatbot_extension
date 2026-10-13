import { createLogger } from '../shared/logger';
import { DEFAULT_AI_MODEL } from '../shared/config';
import { filterTextGenerationModels } from '../shared/models';

const logger = createLogger('ApiKeyTester');

export interface ApiKeyTestResult {
  success: boolean;
  latencyMs?: number;
  supportedModels?: string[];
  error?: string;
}

/**
 * Validates a user-supplied Gemini API key against the official Google AI endpoint.
 * Secret keys are NEVER logged or printed to errors.
 */
export async function testGeminiApiKey(
  apiKey: string,
  _modelName: string = DEFAULT_AI_MODEL
): Promise<ApiKeyTestResult> {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    return {
      success: false,
      error: 'API key cannot be empty.',
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // Calling models listing endpoint to test credentials without consuming generation quota
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      const sanitizedModels = filterTextGenerationModels(Array.isArray(data?.models) ? data.models : []);

      if (sanitizedModels.length === 0) {
        logger.warn('Gemini API key verified, but no text generation models found');
        return {
          success: false,
          error: 'API Error: No compatible text generation models (generateContent) found for this key.',
        };
      }

      logger.info('Gemini API key verified successfully', {
        latencyMs,
        modelsCount: sanitizedModels.length,
      });

      return {
        success: true,
        latencyMs,
        supportedModels: sanitizedModels.map((m) => m.id),
      };
    }

    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = `${errJson.error.status || 'ERROR'}: ${errJson.error.message}`;
      }
    } catch {
      // ignore json parse errors
    }

    logger.warn('Gemini API key verification failed', { status: response.status });
    return {
      success: false,
      error: `API Error: ${errorDetail}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        error: 'API Error: DEADLINE_EXCEEDED (Request timed out after 8s).',
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Network error testing Gemini API key', { error: message });
    return {
      success: false,
      error: `Network Error: ${message}`,
    };
  }
}
