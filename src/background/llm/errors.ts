import type { LlmErrorCode, S13ScreenTarget } from './types';
import { redactSecrets } from '../../shared/logger';

export class LlmError extends Error {
  public readonly code: LlmErrorCode;
  public readonly status?: number;
  public readonly s13Screen: S13ScreenTarget;
  public readonly retryAfterSeconds?: number;
  public readonly isRetryable: boolean;

  constructor(
    code: LlmErrorCode,
    message: string,
    options?: {
      status?: number;
      retryAfterSeconds?: number;
      cause?: unknown;
    }
  ) {
    // Redact any leaked API keys or credentials from error message
    const cleanMessage = redactSecrets(message);
    super(cleanMessage);
    this.name = 'LlmError';
    this.code = code;
    this.status = options?.status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.s13Screen = mapCodeToS13Screen(code);
    this.isRetryable = isCodeRetryable(code);

    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Maps typed LLM error code to the corresponding Stitch S13/S14 empty/error state.
 */
export function mapCodeToS13Screen(code: LlmErrorCode): S13ScreenTarget {
  switch (code) {
    case 'NO_KEY':
    case 'INVALID_KEY':
      return 'S13.1';
    case 'OFFLINE':
      return 'S13.2';
    case 'RATE_LIMITED':
      return 'S13.3';
    case 'TIMEOUT':
    case 'SERVER_ERROR':
    case 'MALFORMED_JSON':
      return 'S13.4';
    case 'SAFETY_BLOCKED':
      return 'S13.5';
    case 'ABORTED':
    case 'UNKNOWN':
    default:
      return 'NONE';
  }
}

/**
 * Determines if an error code represents a transient, retryable failure.
 */
export function isCodeRetryable(code: LlmErrorCode): boolean {
  return code === 'RATE_LIMITED' || code === 'SERVER_ERROR';
}

/**
 * Parses HTTP status code and response payload into an LlmError
 */
export function parseHttpError(
  status: number,
  statusText: string,
  data?: Record<string, unknown>,
  headers?: Headers
): LlmError {
  let retryAfterSeconds: number | undefined;

  if (headers && headers.has('retry-after')) {
    const rawVal = headers.get('retry-after');
    if (rawVal) {
      const parsed = parseInt(rawVal, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfterSeconds = parsed;
      } else {
        const parsedDate = Date.parse(rawVal);
        if (!isNaN(parsedDate)) {
          retryAfterSeconds = Math.max(1, Math.ceil((parsedDate - Date.now()) / 1000));
        }
      }
    }
  }

  const message =
    (data?.error as { message?: string })?.message ||
    `HTTP ${status} ${statusText || 'Error'}`;

  // Missing or invalid credentials
  if (status === 400 && message.toLowerCase().includes('api_key_invalid')) {
    return new LlmError('INVALID_KEY', 'API key is invalid or malformed.', { status });
  }
  if (status === 403 || message.toLowerCase().includes('permission_denied') || message.toLowerCase().includes('api key not valid')) {
    return new LlmError('INVALID_KEY', 'API key does not have permission or is invalid.', { status });
  }

  // Rate limit
  if (status === 429 || message.toLowerCase().includes('resource_exhausted')) {
    return new LlmError('RATE_LIMITED', 'Rate limit exceeded. Please wait before retrying.', {
      status,
      retryAfterSeconds: retryAfterSeconds || 60,
    });
  }

  // Server error
  if (status >= 500) {
    return new LlmError('SERVER_ERROR', `Gemini server returned status ${status}.`, {
      status,
      retryAfterSeconds,
    });
  }

  return new LlmError('UNKNOWN', message, { status });
}
