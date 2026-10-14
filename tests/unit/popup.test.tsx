// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PopupApp } from '../../src/popup/PopupApp';
import * as messaging from '../../src/shared/messaging';

// Set React act environment flag
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../src/shared/messaging', () => ({
  sendToBackground: vi.fn(),
}));

describe('PopupApp & 4 Variants (Step 11 — S09)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as { chrome: unknown }).chrome = {
      sidePanel: { open: vi.fn() },
      tabs: {
        query: vi.fn().mockImplementation((_q: unknown, cb?: (tabs: Array<{ id: number; url?: string }>) => void) => {
          const res = [{ id: 101, url: 'https://en.wikipedia.org/wiki/Dijkstra' }];
          if (cb) cb(res);
          return Promise.resolve(res);
        }),
      },
      runtime: { openOptionsPage: vi.fn(), getURL: vi.fn((path: string) => path) },
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders Variant 1 (Active) with watching beacon, domain pill, and 3 stat tiles', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValueOnce({
      type: 'POPUP_STATE',
      variant: 'active',
      siteDomain: 'leetcode.com/problems/two-sum',
      url: 'https://leetcode.com/problems/two-sum',
      problemTitle: 'Two Sum',
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 4,
      acceptedCount: 3,
      acceptRate: 0.75,
      hintsUsedCount: 2,
      hintsLeftCount: 4,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    expect(container.textContent).toContain('ACTIVE');
    expect(container.textContent).toContain('Watching this page');
    expect(container.textContent).toContain('leetcode.com/problems/two-sum');
    expect(container.textContent).toContain('Nudges');
    expect(container.textContent).toContain('Accepted');
    expect(container.textContent).toContain('Hints');
    expect(container.textContent).toContain('Open side panel');
    expect(container.textContent).toContain('Pause for 1 hour');
    expect(container.textContent).not.toContain('Tier 1');
    expect(container.textContent).not.toContain('/6');
    expect(container.textContent).not.toContain('⌥S');
    expect(container.textContent).not.toContain('Local LLM');
  });

  it('renders Variant 2 (Paused) with pause warning, progress track, and resume button', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValueOnce({
      type: 'POPUP_STATE',
      variant: 'paused',
      siteDomain: 'leetcode.com/problems/two-sum',
      url: 'https://leetcode.com/problems/two-sum',
      isContest: false,
      isPaused: true,
      isSnoozed: true,
      pauseRemainingMs: 42 * 60 * 1000,
      pauseElapsedMs: 18 * 60 * 1000,
      nudgesCount: 4,
      acceptedCount: 3,
      acceptRate: 0.75,
      hintsUsedCount: 2,
      hintsLeftCount: 4,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    expect(container.textContent).toContain('PAUSED');
    expect(container.textContent).toContain('Paused on leetcode.com');
    expect(container.textContent).toContain('Resume watching');
    expect(container.textContent).toContain('Keep paused for today');
    expect(container.textContent).toContain('18m elapsed');
    expect(container.textContent).toContain('42m remaining');
  });

  it('renders Variant 3 for restricted browser schemes (S13.5 notice)', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValueOnce({
      type: 'POPUP_STATE',
      variant: 'unsupported',
      siteDomain: 'chrome://extensions',
      url: 'chrome://extensions',
      isRestrictedScheme: true,
      canEnable: false,
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 0,
      acceptedCount: 0,
      acceptRate: 0,
      hintsUsedCount: 0,
      hintsLeftCount: 0,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    expect(container.textContent).toContain('INACTIVE');
    expect(container.textContent).toContain("I can't run on this page");
    expect(container.textContent).toContain('Browser internal pages, system viewers, and the Web Store are restricted by browser policy');
    expect(container.textContent).toContain('Target: chrome://extensions');
    expect(container.textContent).not.toContain('Open scratchpad panel');
    expect(container.textContent).not.toContain('Local LLM');
  });

  it('renders Variant 3 for normal web pages with 3 Universal Mode opt-in actions', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValueOnce({
      type: 'POPUP_STATE',
      variant: 'unsupported',
      siteDomain: 'en.wikipedia.org',
      url: 'https://en.wikipedia.org/wiki/Dijkstra',
      isRestrictedScheme: false,
      canEnable: true,
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 0,
      acceptedCount: 0,
      acceptRate: 0,
      hintsUsedCount: 0,
      hintsLeftCount: 0,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    expect(container.textContent).toContain('INACTIVE');
    expect(container.textContent).toContain('Enable for this site');
    expect(container.textContent).toContain('Use on this page once');
    expect(container.textContent).toContain('Always allow on this site');
    expect(container.textContent).toContain('Open chat without page');
    expect(container.textContent).not.toContain('Open scratchpad panel');
    expect(container.textContent).not.toContain('Local LLM');
  });

  it('dispatches ENABLE_SITE_ONCE when clicking "Use on this page once"', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValue({
      type: 'POPUP_STATE',
      variant: 'unsupported',
      siteDomain: 'en.wikipedia.org',
      url: 'https://en.wikipedia.org/wiki/Dijkstra',
      isRestrictedScheme: false,
      canEnable: true,
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 0,
      acceptedCount: 0,
      acceptRate: 0,
      hintsUsedCount: 0,
      hintsLeftCount: 0,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    const enableOnceBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Use on this page once')
    );
    expect(enableOnceBtn).toBeDefined();

    await act(async () => {
      enableOnceBtn?.click();
    });

    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'ENABLE_SITE_ONCE',
      tabId: 101,
    });
  });

  it('renders Variant 4 (Contest) with fair-play badge and integrity lock notice', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValueOnce({
      type: 'POPUP_STATE',
      variant: 'contest',
      siteDomain: 'codeforces.com/contest/1971/problem/A',
      url: 'https://codeforces.com/contest/1971/problem/A',
      isContest: true,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 0,
      acceptedCount: 0,
      acceptRate: 0,
      hintsUsedCount: 0,
      hintsLeftCount: 0,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    expect(container.textContent).toContain('FAIR PLAY');
    expect(container.textContent).toContain('Contest mode active');
    expect(container.textContent).toContain('Integrity Lock Engaged');
    expect(container.textContent).toContain('Open post-contest review');
  });

  it('triggers side panel launch when "Open side panel" button is clicked', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValue({
      type: 'POPUP_STATE',
      variant: 'active',
      siteDomain: 'leetcode.com/problems/two-sum',
      url: 'https://leetcode.com/problems/two-sum',
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 4,
      acceptedCount: 3,
      acceptRate: 0.75,
      hintsUsedCount: 2,
      hintsLeftCount: 4,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    const openBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Open side panel')
    );
    expect(openBtn).toBeDefined();

    await act(async () => {
      openBtn?.click();
    });

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 101 });
  });

  it('triggers pause 1 hour message dispatch', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValue({
      type: 'POPUP_STATE',
      variant: 'active',
      siteDomain: 'leetcode.com/problems/two-sum',
      url: 'https://leetcode.com/problems/two-sum',
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 4,
      acceptedCount: 3,
      acceptRate: 0.75,
      hintsUsedCount: 2,
      hintsLeftCount: 4,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    const pauseBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Pause for 1 hour')
    );
    expect(pauseBtn).toBeDefined();

    await act(async () => {
      pauseBtn?.click();
    });

    expect(messaging.sendToBackground).toHaveBeenCalledWith({
      type: 'SET_SNOOZE',
      durationMinutes: 60,
    });
  });

  it('triggers options page opening on settings button click', async () => {
    vi.mocked(messaging.sendToBackground).mockResolvedValue({
      type: 'POPUP_STATE',
      variant: 'active',
      siteDomain: 'leetcode.com/problems/two-sum',
      url: 'https://leetcode.com/problems/two-sum',
      isContest: false,
      isPaused: false,
      isSnoozed: false,
      nudgesCount: 4,
      acceptedCount: 3,
      acceptRate: 0.75,
      hintsUsedCount: 2,
      hintsLeftCount: 4,
    } as unknown as Record<string, unknown>);

    await act(async () => {
      root.render(<PopupApp />);
    });

    const settingsBtn = container.querySelector('button[aria-label="Settings"]') as HTMLButtonElement;
    expect(settingsBtn).not.toBeNull();

    await act(async () => {
      settingsBtn.click();
    });

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
