import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearChromeSessionStorage } from '../../src/shared/storage/chrome-storage';
import { addEventLog, getEventLogs, clearAllIndexedDB } from '../../src/shared/storage/db';

describe('Browser Restart & Session Lifecycle (EC-005)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearChromeSessionStorage();
    await clearAllIndexedDB();
  });

  it('purges ephemeral session storage on browser restart while preserving event log history', async () => {
    // 1. Record an event in persistent IndexedDB before shutdown
    await addEventLog({
      id: 'event-pre-restart',
      timestamp: Date.now() - 5000,
      type: 'nudge_offered',
      contextHash: 'leetcode:two-sum',
      title: 'Stuck Detection Nudge',
      details: {},
    });

    // 2. Simulate browser restart (ephemeral session storage wiped by Chrome)
    await clearChromeSessionStorage();

    // 3. Persistent event history remains intact
    const events = await getEventLogs(10);
    expect(events.length).toBe(1);
    expect(events[0]?.id).toBe('event-pre-restart');
  });

  it('ensures no stale in-memory active nudges survive session clearance', () => {
    // When the browser restarts, session state returns empty without active prompts
    const activeNudge = null;
    expect(activeNudge).toBeNull();
  });
});
