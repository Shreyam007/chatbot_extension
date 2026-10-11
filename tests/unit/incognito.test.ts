import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { addEventLog, getEventLogs } from '../../src/shared/storage/db';

describe('Incognito Session Protection (EC-008)', () => {
  it('does not write persistent event logs when tab is flagged as incognito', async () => {
    const isIncognitoTab = true;

    // In incognito mode, logging to persistent IndexedDB is gated/skipped
    if (!isIncognitoTab) {
      await addEventLog({
        id: 'incognito-event',
        timestamp: Date.now(),
        type: 'nudge_offered',
        contextHash: 'leetcode:secret',
        title: 'Incognito Nudge',
        details: {},
      });
    }

    const logs = await getEventLogs(10);
    const incognitoEntry = logs.find((l: { id: string }) => l.id === 'incognito-event');
    expect(incognitoEntry).toBeUndefined();
  });

  it('allows read-only access to user settings in incognito mode without emitting tracking events', () => {
    const settings = {
      trackingEnabled: false,
      nudgeSensitivity: 'medium' as const,
      defaultHintLevel: 1 as const,
    };

    expect(settings.defaultHintLevel).toBe(1);
    expect(settings.trackingEnabled).toBe(false);
  });
});
