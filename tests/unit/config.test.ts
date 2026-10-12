import { describe, it, expect } from 'vitest';
import { APP_NAME, DEFAULT_AI_MODEL, SUPPORTED_AI_MODELS, DEFAULT_SETTINGS } from '../../src/shared/config';

describe('Shared Configuration', () => {
  it('has expected APP_NAME', () => {
    expect(APP_NAME).toBe('Unstuck');
  });

  it('uses officially documented active Gemini model as default', () => {
    expect(DEFAULT_AI_MODEL).toBe('gemini-2.5-flash');
    expect(SUPPORTED_AI_MODELS).toContain('gemini-2.5-flash');
    expect(SUPPORTED_AI_MODELS).toContain('gemini-1.5-flash');
  });

  it('defaults tracking to disabled until explicit onboarding consent', () => {
    expect(DEFAULT_SETTINGS.trackingEnabled).toBe(false);
  });

  it('enforces contest auto-disable as locked true', () => {
    expect(DEFAULT_SETTINGS.contestAutoDisable).toBe(true);
  });

  it('defaults demoMode to false and enforces standard 15-minute cooldown when off (Rule 5)', () => {
    expect(DEFAULT_SETTINGS.demoMode).toBe(false);
    expect(DEFAULT_SETTINGS.cooldownMin).toBe(15);
  });
});
