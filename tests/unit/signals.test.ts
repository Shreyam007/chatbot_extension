// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignalCollector } from '../../src/content/signals/collector';
import { SignalWindowSchema } from '../../src/shared/schemas/signals';

describe('SignalCollector (Step 5)', () => {
  let collector: SignalCollector;

  beforeEach(() => {
    vi.useFakeTimers();
    collector = new SignalCollector({
      idleThresholdMs: 60_000,
      scrollThresholdPx: 80,
      verdictDedupeWindowMs: 5_000,
    });
  });

  afterEach(() => {
    collector.destroy();
    vi.useRealTimers();
  });

  it('initializes with a valid empty signal snapshot', () => {
    const snapshot = collector.getSnapshot();
    expect(snapshot.dwellMs).toBe(0);
    expect(snapshot.activeMs).toBe(0);
    expect(snapshot.idleMs).toBe(0);
    expect(snapshot.scrollReversals).toBe(0);
    expect(snapshot.tabSwitches).toBe(0);
    expect(snapshot.wrongSubmissions).toBe(0);

    const parseResult = SignalWindowSchema.safeParse(snapshot);
    expect(parseResult.success).toBe(true);
  });

  it('accumulates dwell and active time monotonically while active', () => {
    collector.start();

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);
    collector.tick();

    const snapshot = collector.getSnapshot();
    expect(snapshot.dwellMs).toBeGreaterThanOrEqual(4900);
    expect(snapshot.activeMs).toBeGreaterThanOrEqual(4900);
    expect(snapshot.idleMs).toBe(0);
    expect(collector.getIsIdle()).toBe(false);
  });

  it('transitions to idle after 60s of inactivity and routes dwell to idleMs (EC-042)', () => {
    collector.start();

    // Advance 30 seconds active
    vi.advanceTimersByTime(30_000);
    collector.tick();

    // Advance another 35 seconds without user activity (> 60s total)
    vi.advanceTimersByTime(35_000);
    collector.tick();

    expect(collector.getIsIdle()).toBe(true);

    // Advance another 10 seconds while idle
    vi.advanceTimersByTime(10_000);
    collector.tick();

    const snapshot = collector.getSnapshot();
    expect(snapshot.idleMs).toBeGreaterThanOrEqual(9900);
    expect(snapshot.dwellMs).toBe(snapshot.activeMs + snapshot.idleMs);
  });

  it('pauses dwell accumulation completely when window is blurred or tab hidden (EC-041)', () => {
    collector.start();

    // Simulate window blur
    window.dispatchEvent(new Event('blur'));

    // Advance 10 seconds while blurred
    vi.advanceTimersByTime(10_000);
    collector.tick();

    let snapshot = collector.getSnapshot();
    expect(snapshot.dwellMs).toBe(0);
    expect(snapshot.activeMs).toBe(0);

    // Simulate window focus
    window.dispatchEvent(new Event('focus'));

    // Advance 5 seconds while focused
    vi.advanceTimersByTime(5000);
    collector.tick();

    snapshot = collector.getSnapshot();
    expect(snapshot.dwellMs).toBeGreaterThanOrEqual(4900);
    expect(snapshot.activeMs).toBeGreaterThanOrEqual(4900);
  });

  it('tracks scroll reversals when direction changes past threshold (EC-047)', () => {
    collector.start();

    // Simulate scrolling down by 100px
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    window.dispatchEvent(new Event('scroll'));

    // Scroll down further to 250px (total 250px down)
    Object.defineProperty(window, 'scrollY', { value: 250, writable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(collector.getSnapshot().scrollReversals).toBe(0);

    // Now reverse scroll up by 120px to 130px (> 80px threshold)
    Object.defineProperty(window, 'scrollY', { value: 130, writable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(collector.getSnapshot().scrollReversals).toBe(1);

    // Now reverse again down by 100px to 230px
    Object.defineProperty(window, 'scrollY', { value: 230, writable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(collector.getSnapshot().scrollReversals).toBe(2);
  });

  it('deduplicates rapid wrong submission verdicts within window (EC-045)', () => {
    collector.addVerdictResult({
      verdict: 'wrong',
      rawText: 'Wrong Answer on test 1',
    });
    expect(collector.getSnapshot().wrongSubmissions).toBe(1);

    // Rapid duplicate submission 1 second later (same error text)
    vi.advanceTimersByTime(1000);
    collector.addVerdictResult({
      verdict: 'wrong',
      rawText: 'Wrong Answer on test 1',
    });
    // Should NOT increment
    expect(collector.getSnapshot().wrongSubmissions).toBe(1);

    // After 6 seconds (> 5s dedupe window), submitting counts again
    vi.advanceTimersByTime(6000);
    collector.addVerdictResult({
      verdict: 'wrong',
      rawText: 'Time Limit Exceeded',
    });
    expect(collector.getSnapshot().wrongSubmissions).toBe(2);
  });

  it('resets all metrics cleanly when navigating to a new problem (EC-022)', () => {
    collector.start();
    vi.advanceTimersByTime(5000);
    collector.tick();

    collector.addVerdictResult({ verdict: 'wrong', rawText: 'WA' });

    let snapshot = collector.getSnapshot();
    expect(snapshot.dwellMs).toBeGreaterThan(0);
    expect(snapshot.wrongSubmissions).toBe(1);

    collector.reset();

    snapshot = collector.getSnapshot();
    expect(snapshot.dwellMs).toBe(0);
    expect(snapshot.activeMs).toBe(0);
    expect(snapshot.idleMs).toBe(0);
    expect(snapshot.wrongSubmissions).toBe(0);
    expect(snapshot.scrollReversals).toBe(0);
    expect(snapshot.tabSwitches).toBe(0);
  });
});
