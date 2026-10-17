import { APP_VERSION } from '../config';
import type { ErrorRecord } from '../messaging/protocol';
import { createLogger } from '../logger';
import { isCancellation } from './cancellation';

const logger = createLogger('ErrorReporter');

const MAX_ERROR_RECORDS = 50;
const STORAGE_KEY = 'recent_errors';

// Memory fallback ring buffer
let inMemoryBuffer: ErrorRecord[] = [];

/**
 * Strips potential API keys, sensitive tokens, or secrets from error strings.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'Unknown error';
  return msg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/(?:key|token|auth|secret|bearer)[=:\s]+[A-Za-z0-9_-]{10,}/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s]+/g, (match) => {
      try {
        const u = new URL(match);
        return `${u.origin}${u.pathname}`;
      } catch {
        return match;
      }
    });
}

/**
 * Records an error in the ring buffer (session storage + memory fallback).
 */
export async function recordError(
  item: Omit<ErrorRecord, 'id' | 'timestamp' | 'version'>
): Promise<void> {
  const newRecord: ErrorRecord = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    version: APP_VERSION,
    source: item.source,
    message: sanitizeErrorMessage(item.message),
    fileLine: item.fileLine,
    tabId: item.tabId,
  };

  inMemoryBuffer.unshift(newRecord);
  if (inMemoryBuffer.length > MAX_ERROR_RECORDS) {
    inMemoryBuffer.pop();
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const stored = await chrome.storage.session.get([STORAGE_KEY]);
      const list: ErrorRecord[] = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
      list.unshift(newRecord);
      if (list.length > MAX_ERROR_RECORDS) {
        list.length = MAX_ERROR_RECORDS;
      }
      await chrome.storage.session.set({ [STORAGE_KEY]: list });
    }
  } catch {
    // Session storage unavailable; inMemoryBuffer serves as fallback
  }
}

/**
 * Retrieves the recent errors ring buffer.
 */
export async function getRecentErrors(): Promise<ErrorRecord[]> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const stored = await chrome.storage.session.get([STORAGE_KEY]);
      if (Array.isArray(stored[STORAGE_KEY])) {
        return stored[STORAGE_KEY];
      }
    }
  } catch {
    // Fallback to memory
  }
  return inMemoryBuffer;
}

/**
 * Clears the error ring buffer.
 */
export async function clearRecentErrors(): Promise<void> {
  inMemoryBuffer = [];
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      await chrome.storage.session.remove([STORAGE_KEY]);
    }
  } catch {
    // Ignore
  }
}

/**
 * Installs global error and unhandledrejection event listeners.
 */
export function installGlobalErrorHandlers(
  source: ErrorRecord['source'],
  tabId?: number
): () => void {
  const target: EventTarget | null =
    typeof window !== 'undefined'
      ? window
      : typeof self !== 'undefined'
      ? self
      : null;

  if (!target || typeof target.addEventListener !== 'function') {
    return () => {};
  }

  const errorHandler = (event: Event): void => {
    try {
      const errEvt = event as ErrorEvent;
      const message = errEvt.message || (errEvt.error ? String(errEvt.error.message || errEvt.error) : 'Unknown Script Error');
      const fileLine = errEvt.filename ? `${errEvt.filename}:${errEvt.lineno || 0}:${errEvt.colno || 0}` : undefined;

      // Ignore noise from non-extension domains in content scripts unless relevant
      if (source === 'content' && !fileLine?.includes('chrome-extension://')) {
        return;
      }

      void recordError({
        source,
        message,
        fileLine,
        tabId,
      });
    } catch {
      // Safe guard against recursive crash
    }
  };

  const rejectionHandler = (event: Event): void => {
    try {
      const rejEvt = event as PromiseRejectionEvent;
      const reason = rejEvt.reason;

      // Global safety net: If rejection is an intentional cancellation, prevent browser error reporting
      if (isCancellation(reason)) {
        if (typeof rejEvt.preventDefault === 'function') {
          rejEvt.preventDefault();
        }
        logger.debug('Swallowed expected cancellation in unhandledrejection listener:', reason);
        return;
      }

      const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
      const fileLine = reason instanceof Error && reason.stack ? reason.stack.split('\n')[1]?.trim() : undefined;

      void recordError({
        source,
        message: `Unhandled rejection: ${message}`,
        fileLine,
        tabId,
      });
    } catch {
      // Safe guard against recursive crash
    }
  };

  target.addEventListener('error', errorHandler);
  target.addEventListener('unhandledrejection', rejectionHandler);

  return () => {
    target.removeEventListener('error', errorHandler);
    target.removeEventListener('unhandledrejection', rejectionHandler);
  };
}
