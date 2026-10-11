/**
 * Runtime helpers for test keys.
 * 
 * To ensure static secret scanners (GitHub Secret Scanning, Gitleaks, etc.)
 * are never triggered by test code, test keys that need to match the real Google API
 * key shape (for redaction tests) are constructed dynamically at RUNTIME.
 * 
 * Production regex: /AIzaSy[A-Za-z0-9_-]{33}/g (39 chars total)
 */

export function createSyntheticKey(fillChar = 'A'): string {
  const p1 = 'AI' + 'za';
  const p2 = 'Sy';
  const padding = (fillChar.repeat(33)).slice(0, 33);
  return `${p1}${p2}${padding}`;
}

export function createSyntheticKeyWithDigits(): string {
  const p1 = 'AI' + 'za';
  const p2 = 'Sy';
  const digits = '01234567890123456789012345678901234'.slice(0, 33);
  return `${p1}${p2}${digits}`;
}

/**
 * Clearly fake keys for tests where realistic shape is not needed.
 */
export const FAKE_API_KEY = 'FAKE_TEST_KEY_NOT_REAL';
