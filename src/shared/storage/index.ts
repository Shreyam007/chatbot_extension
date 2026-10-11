import { APP_NAME, APP_VERSION, DEFAULT_SETTINGS } from '../config';
import { createLogger } from '../logger';
import {
  getStoredSettings,
  setStoredSettings,
  clearChromeLocalStorage,
  clearChromeSessionStorage
} from './chrome-storage';
import {
  getEventLogs,
  getAllHints,
  getAllMastery,
  getAllBanditStats,
  clearAllIndexedDB
} from './db';
import type { Settings } from '../schemas/settings';
import type { EventLogEntry } from '../schemas/events';
import type { Mastery, BanditStats } from '../schemas/mastery';

const logger = createLogger('StorageManager');

export interface ExportDataPayload {
  app: string;
  version: string;
  exportedAt: number;
  settings: Settings;
  mastery: Mastery;
  banditStats: BanditStats;
  eventsCount: number;
  events: EventLogEntry[];
  hintsDeliveredCount: number;
  // NOTE: apiKey is strictly EXCLUDED per Rule 4
}

/**
 * Produces a complete, privacy-preserving JSON export of all locally stored user data.
 * The Gemini API key is NEVER included in this export.
 */
export async function exportAllData(): Promise<ExportDataPayload> {
  logger.info('Generating privacy-compliant export payload');
  const [settings, mastery, banditStats, events, hints] = await Promise.all([
    getStoredSettings(),
    getAllMastery(),
    getAllBanditStats(),
    getEventLogs(),
    getAllHints(),
  ]);

  return {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: Date.now(),
    settings,
    mastery,
    banditStats,
    eventsCount: events.length,
    events,
    hintsDeliveredCount: hints.length,
  };
}

/**
 * Performs a comprehensive hard reset of all persistent storage:
 * - Wipes chrome.storage.local
 * - Wipes chrome.storage.session
 * - Clears all IndexedDB object stores (events, hints, mastery, bandit)
 * - Restores default settings
 */
export async function deleteAllData(): Promise<void> {
  logger.info('Initiating total wipe of all extension data');

  await Promise.all([
    clearChromeLocalStorage(),
    clearChromeSessionStorage(),
    clearAllIndexedDB(),
  ]);

  // Re-seed default settings and state cleanly
  await setStoredSettings(DEFAULT_SETTINGS);

  logger.info('All data purged and storage re-initialized to factory defaults');
}

export * from './chrome-storage';
export * from './db';
