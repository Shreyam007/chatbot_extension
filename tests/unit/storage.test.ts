import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addEventLog,
  getEventLogs,
  saveHintRecord,
  getHintsForProblem,
  saveMasteryTopic,
  getAllMastery,
  saveBanditBucket,
  getAllBanditStats,
  clearAllIndexedDB,
  closeDb,
  getStoredSettings,
  setStoredSettings,
  getStoredApiKey,
  setStoredApiKey,
  deleteAllData,
  _setRawLocalStorageForTesting
} from '../../src/shared/storage';
import { DEFAULT_SETTINGS, LIMITS } from '../../src/shared/config';
import type { EventLogEntry } from '../../src/shared/schemas/events';

describe('Step 4: Storage Layer (IndexedDB & Chrome Storage)', () => {
  beforeEach(async () => {
    await clearAllIndexedDB();
  });

  afterEach(() => {
    closeDb();
  });

  describe('IndexedDB Events Log & Cap Trimming', () => {
    it('stores and retrieves event log entries in chronological order', async () => {
      const entry: EventLogEntry = {
        id: 'evt-1',
        timestamp: 1000,
        type: 'nudge_offered',
        contextHash: 'hash-abc',
        title: 'Two Sum',
        details: { signal: 'dwell' },
      };

      await addEventLog(entry);
      const events = await getEventLogs();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(entry);
    });

    it('enforces maximum event log cap by trimming oldest entries when exceeded', async () => {
      // Add entries exceeding LIMITS.MAX_EVENT_LOG_ENTRIES
      const totalToAdd = LIMITS.MAX_EVENT_LOG_ENTRIES + 15;
      for (let i = 0; i < totalToAdd; i++) {
        await addEventLog({
          id: `evt-${i}`,
          timestamp: 1000 + i,
          type: 'nudge_offered',
          contextHash: 'hash-1',
          title: 'Problem 1',
          details: { index: i },
        });
      }

      const events = await getEventLogs();
      expect(events.length).toBeLessThanOrEqual(LIMITS.MAX_EVENT_LOG_ENTRIES);
      // Verify oldest entries (e.g. evt-0 to evt-14) were purged
      expect(events[0]?.id).toBe('evt-15');
      expect(events[events.length - 1]?.id).toBe(`evt-${totalToAdd - 1}`);
    });
  });

  describe('IndexedDB Hints History', () => {
    it('stores and queries hints keyed by problem hash', async () => {
      await saveHintRecord({
        id: 'hint-1',
        problemHash: 'prob-two-sum',
        timestamp: 2000,
        hint: {
          level: 1,
          text: 'Consider using a hash map for complement lookup.',
          confidence: 0.95,
          checks: { leak: false, grounded: true, relevant: true },
          retries: 0,
          model: 'gemini-2.5-flash',
          latencyMs: 320,
        },
      });

      const hints = await getHintsForProblem('prob-two-sum');
      expect(hints).toHaveLength(1);
      expect(hints[0]?.hint.level).toBe(1);
      expect(hints[0]?.hint.text).toContain('hash map');

      const otherHints = await getHintsForProblem('prob-other');
      expect(otherHints).toHaveLength(0);
    });
  });

  describe('IndexedDB Mastery & Bandit Stats', () => {
    it('persists and updates topic mastery items', async () => {
      await saveMasteryTopic('hash-tables', {
        pKnown: 0.72,
        attempts: 5,
        hintsUsed: 1,
      });

      const mastery = await getAllMastery();
      expect(mastery['hash-tables']).toBeDefined();
      expect(mastery['hash-tables']?.pKnown).toBe(0.72);
      expect(mastery['hash-tables']?.attempts).toBe(5);
    });

    it('persists and updates contextual bandit bucket statistics', async () => {
      await saveBanditBucket('leetcode:stuck_high:mastery_low', {
        accept: 8,
        dismiss: 2,
        ignore: 1,
        n: 11,
      });

      const bandit = await getAllBanditStats();
      expect(bandit['leetcode:stuck_high:mastery_low']).toBeDefined();
      expect(bandit['leetcode:stuck_high:mastery_low']?.accept).toBe(8);
    });
  });

  describe('Corrupt Record Recovery (EC-010)', () => {
    it('resets only corrupted settings to defaults while preserving other storage keys', async () => {
      // 1. Set valid API key and valid settings
      await setStoredApiKey('FAKE_TEST_KEY_NOT_REAL_STORAGE');
      await setStoredSettings({
        ...DEFAULT_SETTINGS,
        trackingEnabled: true,
      });

      // 2. Intentionally inject corrupt settings data
      const corruptData = { trackingEnabled: 'NOT_A_BOOLEAN', nudgeSensitivity: 12345 };
      await _setRawLocalStorageForTesting('settings', corruptData);

      // 3. Read settings -> should catch validation error, reset settings to DEFAULT_SETTINGS
      const settings = await getStoredSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);

      // 4. Verify API key was NOT touched or reset
      const apiKey = await getStoredApiKey();
      expect(apiKey).toBe('FAKE_TEST_KEY_NOT_REAL_STORAGE');
    });
  });

  describe('Total Wipe (deleteAllData)', () => {
    it('clears all IndexedDB stores, local storage, and resets settings', async () => {
      await setStoredApiKey('secret_key');
      await addEventLog({
        id: 'evt-del',
        timestamp: 5000,
        type: 'problem_solved',
        contextHash: 'hash-del',
        title: 'Delete Me',
        details: {},
      });
      await saveMasteryTopic('dp', { pKnown: 0.9, attempts: 10, hintsUsed: 2 });

      await deleteAllData();

      const events = await getEventLogs();
      const mastery = await getAllMastery();
      const apiKey = await getStoredApiKey();
      const settings = await getStoredSettings();

      expect(events).toHaveLength(0);
      expect(Object.keys(mastery)).toHaveLength(0);
      expect(apiKey).toBe('');
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });
});
