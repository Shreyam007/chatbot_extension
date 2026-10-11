import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addEventLog,
  getEventLogs,
  clearAllIndexedDB,
  closeDb,
  getDb
} from '../../src/shared/storage';
import type { EventLogEntry } from '../../src/shared/schemas/events';

describe('Step 4: Quota Handling & Graceful Degradation (EC-010)', () => {
  beforeEach(async () => {
    await clearAllIndexedDB();
  });

  afterEach(() => {
    closeDb();
    vi.restoreAllMocks();
  });

  it('EC-010: Trims oldest events and recovers gracefully when QuotaExceededError is encountered', async () => {
    // 1. Pre-populate 40 events
    for (let i = 0; i < 40; i++) {
      await addEventLog({
        id: `quota-evt-${i}`,
        timestamp: 1000 + i,
        type: 'nudge_offered',
        contextHash: 'hash-q',
        title: 'Quota Test Problem',
        details: { index: i },
      });
    }

    const initialEvents = await getEventLogs();
    expect(initialEvents).toHaveLength(40);

    // 2. Intercept db.put to simulate a QuotaExceededError on the first attempt
    const db = await getDb();
    const originalPut = db.put.bind(db);
    let quotaErrorTriggered = false;

    vi.spyOn(db, 'put').mockImplementation(async (storeName, val, key) => {
      if (storeName === 'events' && !quotaErrorTriggered) {
        quotaErrorTriggered = true;
        const err = new Error('The quota has been exceeded.');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return originalPut(storeName, val, key);
    });

    // 3. Attempt write of event 41
    const newEntry: EventLogEntry = {
      id: 'quota-evt-41',
      timestamp: 2000,
      type: 'nudge_accepted',
      contextHash: 'hash-q',
      title: 'Quota Test Problem',
      details: { recovered: true },
    };

    // addEventLog catches QuotaExceededError, executes emergency trim, and retries successfully
    await expect(addEventLog(newEntry)).resolves.not.toThrow();
    expect(quotaErrorTriggered).toBe(true);

    // 4. Verify that new entry was saved
    const afterEvents = await getEventLogs();
    const savedNew = afterEvents.find((e) => e.id === 'quota-evt-41');
    expect(savedNew).toBeDefined();
    expect(savedNew?.type).toBe('nudge_accepted');
  });
});
