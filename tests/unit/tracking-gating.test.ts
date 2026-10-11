import { describe, it, expect } from 'vitest';
import { evaluateTrackingGating } from '../../src/content/index';
import { DEFAULT_SETTINGS } from '../../src/shared/config';

describe('Step 3: Tracking Consent Gating (EC-001 & EC-002)', () => {
  it('EC-001: First run with default settings (trackingEnabled: false) observes nothing and activates chat-only mode', () => {
    const gating = evaluateTrackingGating(DEFAULT_SETTINGS, 'leetcode.com');
    expect(gating.trackingActive).toBe(false);
    expect(gating.isChatOnly).toBe(true);
    expect(gating.reason).toContain('Tracking consent disabled');
  });

  it('EC-002: User has enabled tracking, but denies or disables specific site -> remains chat-only on that site', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      trackingEnabled: true,
      enabledSites: ['leetcode.com'], // Codeforces excluded / denied
    };

    const gating = evaluateTrackingGating(settings, 'codeforces.com');
    expect(gating.trackingActive).toBe(false);
    expect(gating.isChatOnly).toBe(true);
    expect(gating.reason).toContain('codeforces.com not in enabled platforms');
  });

  it('Enables tracking when consent is ON and on an enabled platform', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      trackingEnabled: true,
      enabledSites: ['leetcode.com', 'codeforces.com'],
    };

    const leetcodeGating = evaluateTrackingGating(settings, 'leetcode.com');
    expect(leetcodeGating.trackingActive).toBe(true);
    expect(leetcodeGating.isChatOnly).toBe(false);

    const codeforcesGating = evaluateTrackingGating(settings, 'codeforces.com');
    expect(codeforcesGating.trackingActive).toBe(true);
    expect(codeforcesGating.isChatOnly).toBe(false);
  });
});
