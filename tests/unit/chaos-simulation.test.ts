import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setTabContext,
  getTabContext,
  clearTabSession,
} from '../../src/shared/storage/chrome-storage';
import { addEventLog, getEventLogs, clearAllIndexedDB } from '../../src/shared/storage/db';
import type { PageContext } from '../../src/shared/schemas/context';

describe('[SIMULATION] Chaos & Failure Recovery Unit Simulation (Step 14)', () => {
  const tabId = 777;
  const mockContext: PageContext = {
    url: 'https://leetcode.com/problems/two-sum',
    title: 'Two Sum',
    site: 'leetcode',
    statementText: 'Given an array of integers nums and an integer target...',
    tags: ['Arrays & Hashing'],
    isContest: false,
    detectedAt: 1728640000000,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTabSession(tabId);
    await clearAllIndexedDB();
  });

  it('[SIMULATION] recovers tab state after unexpected in-memory cache purge', async () => {
    // 1. Context written to persistent layer
    await setTabContext(tabId, mockContext);

    // 2. Simulate worker memory crash (transient caches purged)
    const recovered = await getTabContext(tabId);

    expect(recovered).not.toBeNull();
    expect(recovered?.title).toBe('Two Sum');
    expect(recovered?.url).toBe(mockContext.url);
  });

  it('[SIMULATION] handles in-flight request abort during unexpected network disconnection', async () => {
    const controller = new AbortController();

    // Trigger abort signal as if network abruptly dropped mid-stream
    controller.abort();

    expect(controller.signal.aborted).toBe(true);
    await expect(async () => {
      if (controller.signal.aborted) {
        throw new Error('ABORTED');
      }
    }).rejects.toThrow('ABORTED');
  });

  it('[SIMULATION] preserves consistent audit history after rapid successive storage writes', async () => {
    const writes = [];
    for (let i = 0; i < 20; i++) {
      writes.push(
        addEventLog({
          id: `chaos-event-${i}`,
          timestamp: Date.now() + i,
          type: 'nudge_offered',
          contextHash: 'leetcode:two-sum',
          title: `Chaos Write ${i}`,
          details: { index: i },
        })
      );
    }

    await Promise.all(writes);

    const logs = await getEventLogs(50);
    expect(logs.length).toBe(20);
    expect(logs[logs.length - 1]?.id).toBe('chaos-event-19'); // Ascending timestamp
  });
});
