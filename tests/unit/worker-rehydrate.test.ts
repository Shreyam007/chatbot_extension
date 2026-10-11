import { describe, it, expect, beforeEach } from 'vitest';
import {
  setTabContext,
  getTabContext,
  setTabSignalWindow,
  getTabSignalWindow,
  clearChromeSessionStorage,
} from '../../src/shared/storage/chrome-storage';
import type { PageContext } from '../../src/shared/schemas/context';
import type { SignalWindow } from '../../src/shared/schemas/signals';

describe('Service Worker Rehydration (EC-004)', () => {
  const tabId = 42;
  const mockContext: PageContext = {
    url: 'https://leetcode.com/problems/two-sum',
    title: 'Two Sum',
    site: 'leetcode',
    statementText: 'Given an array of integers nums and an integer target...',
    tags: ['Arrays & Hashing'],
    isContest: false,
    detectedAt: 1728640000000,
  };

  const mockWindow: SignalWindow = {
    windowStart: 1728640000000,
    windowEnd: 1728640300000,
    activeMs: 180000,
    idleMs: 20000,
    dwellMs: 200000,
    scrollReversals: 5,
    wrongSubmissions: 2,
    tabSwitches: 3,
  };

  beforeEach(async () => {
    await clearChromeSessionStorage();
  });

  it('persists and restores page context across simulated worker restarts', async () => {
    // 1. Worker receives context from tab and persists to session storage
    await setTabContext(tabId, mockContext);

    // 2. Simulate worker shutdown (in-memory variables lost, rehydrating from storage.session)
    const restoredContext = await getTabContext(tabId);

    expect(restoredContext).not.toBeNull();
    expect(restoredContext?.title).toBe('Two Sum');
    expect(restoredContext?.url).toBe(mockContext.url);
    expect(restoredContext?.tags).toEqual(['Arrays & Hashing']);
  });

  it('persists and restores active signal window across simulated worker restarts', async () => {
    await setTabSignalWindow(tabId, mockWindow);

    const restoredWindow = await getTabSignalWindow(tabId);

    expect(restoredWindow).not.toBeNull();
    expect(restoredWindow?.dwellMs).toBe(200000);
    expect(restoredWindow?.wrongSubmissions).toBe(2);
    expect(restoredWindow?.scrollReversals).toBe(5);
  });

  it('returns null gracefully when rehydrating a non-existent or expired tab', async () => {
    const unknownTabContext = await getTabContext(9999);
    expect(unknownTabContext).toBeNull();

    const unknownTabWindow = await getTabSignalWindow(9999);
    expect(unknownTabWindow).toBeNull();
  });
});
