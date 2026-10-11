import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  exportAllData,
  setStoredApiKey,
  setStoredSettings,
  addEventLog,
  saveMasteryTopic,
  clearAllIndexedDB,
  closeDb
} from '../../src/shared/storage';
import { DEFAULT_SETTINGS } from '../../src/shared/config';

describe('Step 4: Privacy-Preserving Export (Rule 4)', () => {
  beforeEach(async () => {
    await clearAllIndexedDB();
  });

  afterEach(() => {
    closeDb();
  });

  it('exports user settings, mastery, and event logs but STRICTLY OMITS the API key', async () => {
    const secretApiKey = 'AIzaSy_CONFIDENTIAL_SECRET_KEY_123';
    await setStoredApiKey(secretApiKey);

    await setStoredSettings({
      ...DEFAULT_SETTINGS,
      trackingEnabled: true,
      nudgeSensitivity: 'high',
    });

    await addEventLog({
      id: 'export-evt-1',
      timestamp: 3000,
      type: 'hint_delivered',
      contextHash: 'hash-exp',
      title: 'Export Test',
      details: { hintLevel: 1 },
    });

    await saveMasteryTopic('trees', {
      pKnown: 0.85,
      attempts: 8,
      hintsUsed: 0,
    });

    const exportPayload = await exportAllData();

    // 1. Verify structure and data presence
    expect(exportPayload.app).toBe('Unstuck');
    expect(exportPayload.settings.trackingEnabled).toBe(true);
    expect(exportPayload.settings.nudgeSensitivity).toBe('high');
    expect(exportPayload.mastery['trees']?.pKnown).toBe(0.85);
    expect(exportPayload.eventsCount).toBe(1);
    expect(exportPayload.events[0]?.id).toBe('export-evt-1');

    // 2. Strict verification: API key must NOT exist in exportPayload or JSON string
    expect((exportPayload as unknown as Record<string, unknown>).apiKey).toBeUndefined();
    expect((exportPayload as unknown as Record<string, unknown>).key).toBeUndefined();

    const jsonString = JSON.stringify(exportPayload);
    expect(jsonString).not.toContain(secretApiKey);
    expect(jsonString).not.toContain('apiKey');
  });
});
