// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OverlayHost } from '../../src/content/overlay/host';

vi.mock('../../src/shared/messaging', () => ({
  sendToBackground: vi.fn().mockResolvedValue({ type: 'OPEN_SIDE_PANEL_RESULT', ok: true }),
}));

describe('OverlayHost & S08 Nudge Card (Step 11)', () => {
  let overlay: OverlayHost;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    const existing = document.getElementById('unstuck-overlay-root');
    if (existing) {
      existing.remove();
    }
    overlay = new OverlayHost();
  });

  afterEach(() => {
    overlay.destroy();
    vi.useRealTimers();
  });

  it('mounts into an isolated Shadow DOM host (EC-027)', () => {
    overlay.mount();

    const host = document.getElementById('unstuck-overlay-root');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();

    // Verify both card and FAB are rendered inside shadowRoot
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    const fab = host?.shadowRoot?.getElementById('unstuck-fab-container');
    expect(card).not.toBeNull();
    expect(fab).not.toBeNull();
  });

  it('displays S08 nudge card with title, reason, and preview text', () => {
    overlay.mount();

    const onShowHint = vi.fn();
    const onDismiss = vi.fn();

    overlay.showNudge({
      title: 'Stuck on two pointers?',
      reason: "You've been on this section for 5m with 2 failed test cases.",
      previewText: 'Hint 1 of 4: Check boundary invariants',
      onShowHint,
      onDismiss,
    });

    const host = document.getElementById('unstuck-overlay-root');
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    expect(card?.classList.contains('unstuck-hidden')).toBe(false);

    const titleEl = host?.shadowRoot?.getElementById('unstuck-title');
    const bodyEl = host?.shadowRoot?.getElementById('unstuck-body');
    const previewEl = host?.shadowRoot?.getElementById('unstuck-preview-text');

    expect(titleEl?.textContent).toBe('Stuck on two pointers?');
    expect(bodyEl?.textContent).toBe("You've been on this section for 5m with 2 failed test cases.");
    expect(previewEl?.textContent).toBe('Hint 1 of 4: Check boundary invariants');

    // Test Show a hint button click
    const showHintBtn = host?.shadowRoot?.getElementById('unstuck-show-hint-btn');
    showHintBtn?.click();
    expect(onShowHint).toHaveBeenCalledTimes(1);
  });

  it('triggers auto-dismiss and calls onIgnore after 8 seconds countdown', () => {
    overlay.mount();
    const onIgnore = vi.fn();
    const onDismiss = vi.fn();

    overlay.showNudge({
      reason: 'Long dwell observed',
      onIgnore,
      onDismiss,
    });

    const host = document.getElementById('unstuck-overlay-root');
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    expect(card?.classList.contains('unstuck-hidden')).toBe(false);

    // Advance timers by 8000ms
    vi.advanceTimersByTime(8000);

    expect(card?.classList.contains('unstuck-hidden')).toBe(true);
    expect(onIgnore).toHaveBeenCalledTimes(1);
  });

  it('dismisses on Escape key press (EC-121)', () => {
    overlay.mount();
    const onDismiss = vi.fn();

    overlay.showNudge({
      reason: 'Stuck?',
      onDismiss,
    });

    const host = document.getElementById('unstuck-overlay-root');
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    expect(card?.classList.contains('unstuck-hidden')).toBe(false);

    // Non-escape keys must not dismiss
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(card?.classList.contains('unstuck-hidden')).toBe(false);

    // Press Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(card?.classList.contains('unstuck-hidden')).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('supports snooze dropdown menu actions (10m, 1h, tomorrow)', () => {
    overlay.mount();
    const onSnooze = vi.fn();

    overlay.showNudge({
      reason: 'Stuck?',
      onSnooze,
    });

    const host = document.getElementById('unstuck-overlay-root');
    const snoozeBtn = host?.shadowRoot?.getElementById('unstuck-snooze-btn');
    const snoozeMenu = host?.shadowRoot?.getElementById('unstuck-snooze-menu');

    expect(snoozeMenu?.classList.contains('unstuck-hidden')).toBe(true);

    // Toggle snooze menu open
    snoozeBtn?.click();
    expect(snoozeMenu?.classList.contains('unstuck-hidden')).toBe(false);

    // Click 10 min snooze option
    const item10 = host?.shadowRoot?.querySelector<HTMLElement>('[data-action="snooze-10"]');
    item10?.click();

    expect(onSnooze).toHaveBeenCalledWith(10);
    expect(snoozeMenu?.classList.contains('unstuck-hidden')).toBe(true);
  });

  it('supports "Don\'t nudge on this site" block action', () => {
    overlay.mount();
    const onBlockSite = vi.fn();

    overlay.showNudge({
      reason: 'Stuck?',
      onBlockSite,
    });

    const host = document.getElementById('unstuck-overlay-root');
    const snoozeBtn = host?.shadowRoot?.getElementById('unstuck-snooze-btn');
    snoozeBtn?.click();

    const blockBtn = host?.shadowRoot?.querySelector<HTMLElement>('[data-action="block-site"]');
    blockBtn?.click();

    expect(onBlockSite).toHaveBeenCalledTimes(1);
  });

  it('supports dragging header to reposition card', () => {
    overlay.mount();
    overlay.showNudge({ reason: 'Stuck?' });

    const host = document.getElementById('unstuck-overlay-root');
    const header = host?.shadowRoot?.getElementById('unstuck-header');
    const card = host?.shadowRoot?.getElementById('unstuck-card');

    expect(header).not.toBeNull();
    expect(card).not.toBeNull();

    // Trigger pointerdown on header
    header?.dispatchEvent(
      new PointerEvent('pointerdown', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      })
    );

    // Trigger pointermove
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 150,
        clientY: 120,
      })
    );

    // Card should now have fixed position and updated coords
    expect(card?.style.position).toBe('fixed');

    // Trigger pointerup to release drag
    window.dispatchEvent(new PointerEvent('pointerup'));
  });

  it('guarantees focus protection (EC-120): card elements have tabindex -1 and do not steal document focus', () => {
    overlay.mount();

    // Create an active input in the host page
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();
    expect(document.activeElement).toBe(input);

    overlay.showNudge({ reason: 'Stuck?' });

    const host = document.getElementById('unstuck-overlay-root');
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    const showBtn = host?.shadowRoot?.getElementById('unstuck-show-hint-btn');

    // Assert tabindex is -1
    expect(card?.getAttribute('tabindex')).toBe('-1');
    expect(showBtn?.getAttribute('tabindex')).toBe('-1');

    // Assert activeElement is still the input
    expect(document.activeElement).toBe(input);

    input.remove();
  });

  it('completely silences all overlays in contest mode (EC-031 / EC-100)', () => {
    overlay.mount();
    overlay.setContestMode(true);

    overlay.showNudge({
      reason: 'Should not appear during contest',
    });

    const host = document.getElementById('unstuck-overlay-root');
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    const fab = host?.shadowRoot?.getElementById('unstuck-fab-container');

    // Both card and FAB must be hidden
    expect(card?.classList.contains('unstuck-hidden')).toBe(true);
    expect(fab?.classList.contains('unstuck-hidden')).toBe(true);
  });

  it('clicking the FAB with no active nudge sends OPEN_SIDE_PANEL (Task C.1 / S2)', async () => {
    const { sendToBackground } = await import('../../src/shared/messaging');
    vi.mocked(sendToBackground).mockResolvedValueOnce({ type: 'OPEN_SIDE_PANEL_RESULT', ok: true });

    overlay.mount();
    const host = document.getElementById('unstuck-overlay-root');
    const fabBtn = host?.shadowRoot?.getElementById('unstuck-fab');

    fabBtn?.click();

    expect(sendToBackground).toHaveBeenCalledWith({ type: 'OPEN_SIDE_PANEL' });
  });

  it('displays fallback popover when OPEN_SIDE_PANEL fails (Task C.1)', async () => {
    const { sendToBackground } = await import('../../src/shared/messaging');
    vi.mocked(sendToBackground).mockResolvedValueOnce({
      type: 'OPEN_SIDE_PANEL_RESULT',
      ok: false,
      error: 'SidePanel disabled',
    });

    overlay.mount();
    const host = document.getElementById('unstuck-overlay-root');
    const fabBtn = host?.shadowRoot?.getElementById('unstuck-fab');
    const popover = host?.shadowRoot?.getElementById('unstuck-fab-popover');

    fabBtn?.click();
    await Promise.resolve(); // flush microtask

    expect(popover?.classList.contains('unstuck-hidden')).toBe(false);
    expect(popover?.textContent).toBe('Click the Unstuck toolbar icon to open the panel');
  });

  it('clicking the FAB when a nudge is active expands the card instead of opening side panel (Task C.2)', () => {
    overlay.mount();
    overlay.showNudge({ reason: 'Stuck on problem?' });

    const host = document.getElementById('unstuck-overlay-root');
    const card = host?.shadowRoot?.getElementById('unstuck-card');
    const fab = host?.shadowRoot?.getElementById('unstuck-fab-container');
    const fabBtn = host?.shadowRoot?.getElementById('unstuck-fab');

    // Nudge is shown, green dot is active
    expect(fabBtn?.classList.contains('unstuck-has-nudge')).toBe(true);

    // User collapses to FAB
    overlay.collapseToFab();
    expect(card?.classList.contains('unstuck-hidden')).toBe(true);
    expect(fab?.classList.contains('unstuck-hidden')).toBe(false);

    // Clicking FAB expands card back
    fabBtn?.click();
    expect(card?.classList.contains('unstuck-hidden')).toBe(false);
    expect(fab?.classList.contains('unstuck-hidden')).toBe(true);
  });

  it('supports keyboard activation (Enter / Space) on the FAB (Task C.2)', async () => {
    const { sendToBackground } = await import('../../src/shared/messaging');
    vi.mocked(sendToBackground).mockResolvedValue({ type: 'OPEN_SIDE_PANEL_RESULT', ok: true });

    overlay.mount();
    const host = document.getElementById('unstuck-overlay-root');
    const fabBtn = host?.shadowRoot?.getElementById('unstuck-fab');

    // Press Enter
    fabBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(sendToBackground).toHaveBeenCalledWith({ type: 'OPEN_SIDE_PANEL' });

    vi.advanceTimersByTime(200);

    // Press Space
    fabBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(sendToBackground).toHaveBeenCalledTimes(2);
  });

  it('shows status popover on contextmenu / right-click of FAB (Task C.2)', () => {
    overlay.mount();
    const host = document.getElementById('unstuck-overlay-root');
    const fabBtn = host?.shadowRoot?.getElementById('unstuck-fab');
    const fabMenu = host?.shadowRoot?.getElementById('unstuck-fab-menu');

    expect(fabMenu?.classList.contains('unstuck-hidden')).toBe(true);

    // Right-click
    fabBtn?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(fabMenu?.classList.contains('unstuck-hidden')).toBe(false);
  });
});
