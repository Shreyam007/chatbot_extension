import type { GateCheckResult, PlannerState, PlannerOptions } from './types';
import type { PageContext } from '../../shared/schemas/context';
import type { StuckEstimate } from '../../shared/schemas/signals';
import type { Settings } from '../../shared/schemas/settings';

/**
 * Checks if current local time is within quiet hours (e.g. "23:00" to "07:00")
 */
export function isWithinQuietHours(
  date: Date,
  start: string | number = '23:00',
  end: string | number = '07:00'
): boolean {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const parseToMinutes = (val: string | number, fallbackHour: number): number => {
    if (typeof val === 'number') return val * 60;
    const parts = val.split(':');
    const h = parseInt(parts[0] ?? '', 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return isNaN(h) ? fallbackHour * 60 : h * 60 + (isNaN(m) ? 0 : m);
  };

  const startMin = parseToMinutes(start, 23);
  const endMin = parseToMinutes(end, 7);

  if (startMin > endMin) {
    // Overnight quiet hours (e.g., 23:00 to 07:00)
    return currentMinutes >= startMin || currentMinutes < endMin;
  }
  // Same-day quiet hours
  return currentMinutes >= startMin && currentMinutes < endMin;
}

/**
 * Evaluates all deterministic hard policy gates (EC-060, EC-062, EC-064, EC-100).
 * Hard gates CAN NEVER be overridden by the bandit.
 */
export function evaluateHardGates(
  context: PageContext,
  estimate: StuckEstimate,
  settings: Partial<Settings>,
  state: PlannerState,
  options: PlannerOptions = {},
  now: number = Date.now()
): GateCheckResult {
  // 1. Tracking Consent (EC-001)
  if (!settings.trackingEnabled) {
    return { pass: false, reason: 'Tracking consent disabled' };
  }

  // 2. Contest Fairness Hard Rule (EC-100)
  if (context.isContest) {
    return { pass: false, reason: 'Contest detected (all nudges silenced per fair-play)' };
  }

  // 3. User Site Block List & Never Nudge List (EC-062)
  const isSiteBlocked = state.blockedSites?.some((blocked) => {
    return (
      blocked === context.site ||
      context.url.includes(blocked) ||
      blocked.includes(context.site)
    );
  }) || (settings.neverNudgeSites || []).some((site) => {
    return site === context.site || context.url.includes(site) || site.includes(context.site);
  });
  if (isSiteBlocked) {
    return { pass: false, reason: 'Site is blocked by user preferences' };
  }

  // 3b. Generic Pages: Proactive nudges OFF by default unless explicitly enabled for this site
  const isGeneric = context.contentType && context.contentType !== 'problem';
  if (isGeneric) {
    const isNudgeAllowed = (settings.allowedOrigins || []).some(
      (ao) => ao.enabledNudges && (context.url.includes(ao.origin) || ao.origin.includes(context.site))
    );
    if (!isNudgeAllowed) {
      return { pass: false, reason: 'Nudges are off by default on generic sites (opt-in per site)' };
    }
  }

  // 4. Snooze Active
  if (now < (state.snoozeUntil || 0)) {
    return { pass: false, reason: 'Nudges currently snoozed by user' };
  }

  // 5. Quiet Hours
  if (settings.quietHours?.enabled) {
    const start = settings.quietHours.start ?? 23;
    const end = settings.quietHours.end ?? 7;
    if (isWithinQuietHours(new Date(now), start, end)) {
      return { pass: false, reason: 'Quiet hours active' };
    }
  }

  // 6. Cooldown Period (shortened to 20s in demo mode, EC-066)
  const cooldownMin = settings.cooldownMin ?? 15;
  const cooldownMs = options.demoMode ? 20_000 : cooldownMin * 60_000;
  if (state.lastNudgeTime && now - state.lastNudgeTime < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - (now - state.lastNudgeTime)) / 1000);
    return { pass: false, reason: `In cooldown period (${remainingSec}s remaining)` };
  }

  // 7. Hourly Frequency Cap
  const maxPerHour = settings.maxNudgesPerHour ?? 4;
  const oneHourAgo = now - 3_600_000;
  const nudgesInPastHour = (state.recentNudges || []).filter((ts) => ts >= oneHourAgo).length;
  if (nudgesInPastHour >= maxPerHour) {
    return { pass: false, reason: `Maximum hourly nudges cap reached (${maxPerHour}/hr)` };
  }

  // 8. Same-Problem Session Limit (max 3 nudges without solve)
  const problemSession = state.sessionHistories?.[context.url];
  if (problemSession && !problemSession.solved && problemSession.nudgeCount >= 3) {
    return { pass: false, reason: 'Same-problem repeat limit reached (max 3 nudges)' };
  }

  // 9. Active Tab Restriction (EC-064: Only active focused tab nudges)
  if (options.isTabActive === false) {
    return { pass: false, reason: 'Tab is inactive; background tabs cannot nudge' };
  }

  // 10. Behavioral State Gate
  if (estimate.state === 'flowing') {
    return { pass: false, reason: 'User is flowing comfortably' };
  }
  if (estimate.state === 'distracted') {
    return { pass: false, reason: 'User appears distracted; tutoring nudge inappropriate' };
  }

  return { pass: true };
}
