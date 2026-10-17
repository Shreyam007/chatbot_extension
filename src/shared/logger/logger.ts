import { APP_NAME, LIMITS } from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

const API_KEY_REGEX = /AIzaSy[A-Za-z0-9_-]{33}/g;
const GENERIC_KEY_REGEX = /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?([A-Za-z0-9_.-]+)["']?/gi;

/**
 * Recursively redacts sensitive patterns (API keys, secrets) from any data structure
 */
export function redactSecrets<T>(input: T): T {
  if (typeof input === 'string') {
    return input
      .replace(API_KEY_REGEX, '[REDACTED_API_KEY]')
      .replace(GENERIC_KEY_REGEX, '$1=[REDACTED_SECRET]') as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item)) as unknown as T;
  }

  if (input !== null && typeof input === 'object') {
    const redactedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('key') || lowerKey.includes('secret') || lowerKey.includes('token')) {
        redactedObj[key] = '[REDACTED_SECRET]';
      } else {
        redactedObj[key] = redactSecrets(value);
      }
    }
    return redactedObj as unknown as T;
  }

  return input;
}

export function serializeLogData(data: unknown, maxChars = 1000): string {
  if (data === undefined || data === null) {
    return '';
  }
  if (typeof data === 'string') {
    const redacted = redactSecrets(data);
    return redacted.length > maxChars ? `${redacted.slice(0, maxChars)}...[TRUNCATED]` : redacted;
  }
  if (data instanceof Error) {
    const err = data as unknown as Record<string, unknown> & Error;
    const parts: string[] = [redactSecrets(err.message || String(err))];
    if (err.code) parts.push(`code=${String(err.code)}`);
    if (err.status) parts.push(`status=${String(err.status)}`);
    if (err.quotaKind) parts.push(`quotaKind=${String(err.quotaKind)}`);
    if (err.quotaMetric) parts.push(`quotaMetric=${String(err.quotaMetric)}`);
    if (err.retryAfterSeconds) parts.push(`retryAfter=${String(err.retryAfterSeconds)}s`);
    return parts.join(' | ');
  }
  try {
    const clean = redactSecrets(data);
    const json = JSON.stringify(clean);
    return json.length > maxChars ? `${json.slice(0, maxChars)}...[TRUNCATED]` : json;
  } catch {
    return redactSecrets(String(data));
  }
}

export class Logger {
  private static ringBuffer: LogEntry[] = [];
  private static maxEntries = LIMITS.MAX_LOGGER_ENTRIES;

  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const cleanMessage = redactSecrets(message);
    const serializedData = data !== undefined ? serializeLogData(data) : undefined;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context: this.context,
      message: cleanMessage,
      data: serializedData,
    };

    // Append to ring buffer
    Logger.ringBuffer.push(entry);
    if (Logger.ringBuffer.length > Logger.maxEntries) {
      Logger.ringBuffer.shift();
    }

    // Format console output as a single safe string to prevent [object Object] on extension errors page
    const prefix = `[${APP_NAME}][${this.context}][${level.toUpperCase()}]`;
    const formattedMsg = serializedData
      ? `${prefix} ${entry.message} - ${serializedData}`
      : `${prefix} ${entry.message}`;

    switch (level) {
      case 'debug':
        console.debug(formattedMsg);
        break;
      case 'info':
        console.info(formattedMsg);
        break;
      case 'warn':
        console.warn(formattedMsg);
        break;
      case 'error':
        console.error(formattedMsg);
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * Routes expected operational failures (e.g. 429, offline, invalid key, timeout)
   * to warn or debug, reserving console.error strictly for true unhandled exceptions.
   */
  operationalError(message: string, err: unknown): void {
    const errCode = (err as { code?: string })?.code;
    const isHandled =
      ['RATE_LIMITED', 'OFFLINE', 'INVALID_KEY', 'NO_KEY', 'TIMEOUT', 'NO_PAGE_CONTEXT', 'TRUNCATED_OUTPUT', 'ABORTED'].includes(
        errCode || ''
      ) ||
      (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted')));

    if (isHandled) {
      this.info(message, err);
    } else {
      this.error(message, err);
    }
  }

  static getHistory(): ReadonlyArray<LogEntry> {
    return [...Logger.ringBuffer];
  }

  static clear(): void {
    Logger.ringBuffer = [];
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
