import type { LlmErrorCode, S13ScreenTarget, QuotaKind, Parsed429Details } from './types';
import { redactSecrets } from '../../shared/logger';

export interface LlmErrorOptions {
  status?: number;
  retryAfterSeconds?: number;
  retryAfterMs?: number;
  quotaKind?: QuotaKind;
  quotaMetric?: string;
  model?: string;
  isEstimate?: boolean;
  s13Screen?: S13ScreenTarget;
  cause?: unknown;
}

export class LlmError extends Error {
  public readonly code: LlmErrorCode;
  public readonly status?: number;
  public readonly s13Screen: S13ScreenTarget;
  public readonly retryAfterSeconds?: number;
  public readonly retryAfterMs?: number;
  public readonly quotaKind?: QuotaKind;
  public readonly quotaMetric?: string;
  public readonly model?: string;
  public readonly isEstimate?: boolean;
  public readonly isRetryable: boolean;

  constructor(
    code: LlmErrorCode,
    message: string,
    options?: LlmErrorOptions
  ) {
    // Redact any leaked API keys or credentials from error message
    const cleanMessage = redactSecrets(message);
    super(cleanMessage);
    this.name = 'LlmError';
    this.code = code;
    this.status = options?.status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.retryAfterMs = options?.retryAfterMs;
    this.quotaKind = options?.quotaKind;
    this.quotaMetric = options?.quotaMetric;
    this.model = options?.model;
    this.isEstimate = options?.isEstimate;
    this.s13Screen = options?.s13Screen ?? mapCodeToS13Screen(code);
    this.isRetryable = isCodeRetryable(code, options?.quotaKind);

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
    case 'TRUNCATED_OUTPUT':
      return 'S13.4';
    case 'SAFETY_BLOCKED':
      return 'S13.5';
    case 'NO_PAGE_CONTEXT':
      return 'S14.1';
    case 'ABORTED':
    case 'UNKNOWN':
    default:
      return 'NONE';
  }
}

/**
 * Determines if an error code represents a transient, retryable failure.
 * Per-day quota exhaustion is strictly NON-retryable.
 */
export function isCodeRetryable(code: LlmErrorCode, quotaKind?: QuotaKind): boolean {
  if (code === 'RATE_LIMITED') {
    return quotaKind !== 'per_day';
  }
  return code === 'SERVER_ERROR';
}

/**
 * Parses Google RPC Error details and HTTP headers for 429 Quota Exhaustion
 */
export function parse429Payload(
  data?: Record<string, unknown>,
  headers?: Headers,
  model?: string
): Parsed429Details {
  let retryAfterSeconds: number | undefined;
  let retryAfterMs: number | undefined;
  let isEstimate = false;

  // 1. Check HTTP Retry-After header
  if (headers && headers.has('retry-after')) {
    const rawVal = headers.get('retry-after');
    if (rawVal) {
      const parsed = parseInt(rawVal, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfterSeconds = parsed;
        retryAfterMs = parsed * 1000;
      } else {
        const parsedDate = Date.parse(rawVal);
        if (!isNaN(parsedDate)) {
          const deltaMs = Math.max(1000, parsedDate - Date.now());
          retryAfterMs = deltaMs;
          retryAfterSeconds = Math.ceil(deltaMs / 1000);
        }
      }
    }
  }

  // 2. Check Google RPC Error details
  let quotaMetric: string | undefined;
  let fullErrorText = '';
  if (data?.error && typeof data.error === 'object') {
    const errObj = data.error as { message?: string; details?: unknown[] };
    if (errObj.message) {
      fullErrorText += ' ' + errObj.message;
    }
    if (Array.isArray(errObj.details)) {
      for (const item of errObj.details) {
        if (!item || typeof item !== 'object') continue;
        const detail = item as Record<string, unknown>;
        const typeStr = String(detail['@type'] || '');

        // google.rpc.RetryInfo
        if (typeStr.includes('RetryInfo') && detail.retryDelay !== undefined) {
          const delayVal = detail.retryDelay;
          if (typeof delayVal === 'string') {
            const num = parseFloat(delayVal.replace('s', ''));
            if (!isNaN(num) && num > 0) {
              retryAfterMs = Math.round(num * 1000);
              retryAfterSeconds = Math.ceil(num);
            }
          } else if (typeof delayVal === 'object' && delayVal !== null) {
            const sec = Number((delayVal as { seconds?: number }).seconds || 0);
            const nanos = Number((delayVal as { nanos?: number }).nanos || 0);
            const totalMs = Math.round(sec * 1000 + nanos / 1_000_000);
            if (totalMs > 0) {
              retryAfterMs = totalMs;
              retryAfterSeconds = Math.ceil(totalMs / 1000);
            }
          }
        }

        // google.rpc.QuotaFailure
        if (typeStr.includes('QuotaFailure') && Array.isArray(detail.violations)) {
          for (const v of detail.violations as Array<Record<string, unknown>>) {
            if (v.description) fullErrorText += ' ' + String(v.description);
            if (v.subject) fullErrorText += ' ' + String(v.subject);
          }
        }

        // google.rpc.ErrorInfo
        if (typeStr.includes('ErrorInfo') && detail.metadata) {
          const meta = detail.metadata as Record<string, unknown>;
          if (meta.quota_metric) quotaMetric = String(meta.quota_metric);
          if (meta.quota_limit) fullErrorText += ' ' + String(meta.quota_limit);
        }
      }
    }
  }

  const lowerText = fullErrorText.toLowerCase();

  // 3. Classify Quota Kind
  let kind: QuotaKind = 'unknown';
  if (
    lowerText.includes('per-day') ||
    lowerText.includes('per_day') ||
    lowerText.includes('perday') ||
    lowerText.includes('day') ||
    lowerText.includes('daily')
  ) {
    kind = 'per_day';
  } else if (
    lowerText.includes('per-minute') ||
    lowerText.includes('per_minute') ||
    lowerText.includes('perminute') ||
    lowerText.includes('minute') ||
    lowerText.includes('rpm')
  ) {
    kind = 'per_minute';
  } else if (retryAfterSeconds !== undefined && retryAfterSeconds <= 120) {
    kind = 'per_minute';
  }

  // 4. Default estimation when wait duration not provided
  if (kind === 'per_day') {
    // For per_day, do not invent a reset time, do not offer auto-retry
    retryAfterSeconds = undefined;
    retryAfterMs = undefined;
  } else if (!retryAfterSeconds || retryAfterSeconds <= 0) {
    // For per_minute / unknown, estimate 45s and label as estimate
    retryAfterSeconds = 45;
    retryAfterMs = 45000;
    isEstimate = true;
  }

  return {
    kind,
    retryAfterSeconds,
    retryAfterMs,
    quotaMetric,
    model,
    isEstimate,
  };
}

/**
 * Parses HTTP status code and response payload into an LlmError
 */
export function parseHttpError(
  status: number,
  statusText: string,
  data?: Record<string, unknown>,
  headers?: Headers,
  model?: string
): LlmError {
  const message =
    (data?.error as { message?: string })?.message ||
    `HTTP ${status} ${statusText || 'Error'}`;

  const lowerMsg = message.toLowerCase();
  // Missing or invalid credentials
  if (
    status === 403 ||
    (status === 400 && (lowerMsg.includes('api_key') || lowerMsg.includes('api key') || lowerMsg.includes('invalid key'))) ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('api key not valid')
  ) {
    return new LlmError('INVALID_KEY', message || 'API key is invalid or malformed.', { status, model });
  }

  // Rate limit (HTTP 429 or RESOURCE_EXHAUSTED)
  if (status === 429 || message.toLowerCase().includes('resource_exhausted')) {
    const parsed429 = parse429Payload(data, headers, model);
    const friendlyMsg =
      parsed429.kind === 'per_day'
        ? `Daily quota reached for ${model || 'this model'}. Daily limits reset at midnight Pacific Time.`
        : `Rate limit exceeded (per-minute quota). Pacing requests.`;

    return new LlmError('RATE_LIMITED', friendlyMsg, {
      status,
      retryAfterSeconds: parsed429.retryAfterSeconds,
      retryAfterMs: parsed429.retryAfterMs,
      quotaKind: parsed429.kind,
      quotaMetric: parsed429.quotaMetric,
      model,
      isEstimate: parsed429.isEstimate,
    });
  }

  // Server error
  if (status >= 500) {
    return new LlmError('SERVER_ERROR', `Gemini server returned status ${status}.`, {
      status,
      model,
    });
  }

  return new LlmError('UNKNOWN', message, { status, model });
}
