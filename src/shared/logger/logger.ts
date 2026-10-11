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

export class Logger {
  private static ringBuffer: LogEntry[] = [];
  private static maxEntries = LIMITS.MAX_LOGGER_ENTRIES;

  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context: this.context,
      message: redactSecrets(message),
      data: data !== undefined ? redactSecrets(data) : undefined,
    };

    // Append to ring buffer
    Logger.ringBuffer.push(entry);
    if (Logger.ringBuffer.length > Logger.maxEntries) {
      Logger.ringBuffer.shift();
    }

    // Format console output
    const prefix = `[${APP_NAME}][${this.context}][${level.toUpperCase()}]`;
    const formattedMsg = `${prefix} ${entry.message}`;

    switch (level) {
      case 'debug':
        console.debug(formattedMsg, entry.data ?? '');
        break;
      case 'info':
        console.info(formattedMsg, entry.data ?? '');
        break;
      case 'warn':
        console.warn(formattedMsg, entry.data ?? '');
        break;
      case 'error':
        console.error(formattedMsg, entry.data ?? '');
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
