import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, redactSecrets, createLogger } from '../../src/shared/logger';

describe('Step 2: Structured Logger & Secret Redaction', () => {
  beforeEach(() => {
    Logger.clear();
  });

  describe('redactSecrets', () => {
    it('redacts Google Gemini API keys from strings', () => {
      const raw = 'Calling Gemini with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q and model gemini-2.5-flash';
      const redacted = redactSecrets(raw);
      expect(redacted).not.toContain('AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q');
      expect(redacted).toContain('[REDACTED_API_KEY]');
      expect(redacted).toContain('gemini-2.5-flash');
    });

    it('redacts sensitive fields in nested objects', () => {
      const data = {
        user: 'student',
        apiKey: 'secret-12345',
        nested: {
          secretToken: 'shhh-token',
          safeValue: 42,
        },
      };
      const redacted = redactSecrets(data) as typeof data;
      expect(redacted.apiKey).toBe('[REDACTED_SECRET]');
      expect(redacted.nested.secretToken).toBe('[REDACTED_SECRET]');
      expect(redacted.nested.safeValue).toBe(42);
      expect(redacted.user).toBe('student');
    });

    it('leaves standard problem statements and numbers untouched', () => {
      const statement = 'Given an array nums of size n, return the majority element.';
      expect(redactSecrets(statement)).toBe(statement);
    });
  });

  describe('Logger Ring Buffer & Levels', () => {
    it('captures logs into in-memory ring buffer with timestamps and context', () => {
      const logger = createLogger('TestComponent');
      logger.info('Initialization complete', { port: 8080 });
      logger.warn('Approaching memory limit');

      const history = Logger.getHistory();
      expect(history.length).toBe(2);
      expect(history[0]?.context).toBe('TestComponent');
      expect(history[0]?.level).toBe('info');
      expect(history[0]?.message).toBe('Initialization complete');
      expect(history[1]?.level).toBe('warn');
    });

    it('automatically redacts API keys logged via messages or data payloads', () => {
      const logger = createLogger('AuthService');
      logger.error('Failed request with AIzaSy01234567890123456789012345678901234', {
        key: 'AIzaSy01234567890123456789012345678901234',
      });

      const history = Logger.getHistory();
      expect(history[0]?.message).toContain('[REDACTED_API_KEY]');
      expect(JSON.stringify(history[0]?.data)).not.toContain('AIzaSy01234567890123456789012345678901234');
    });

    it('caps ring buffer at max entries without unbounded growth', () => {
      const logger = createLogger('LoopTest');
      for (let i = 0; i < 250; i++) {
        logger.debug(`Log event #${i}`);
      }

      const history = Logger.getHistory();
      expect(history.length).toBe(200); // LIMITS.MAX_LOGGER_ENTRIES = 200
      expect(history[history.length - 1]?.message).toBe('Log event #249');
    });
  });
});
