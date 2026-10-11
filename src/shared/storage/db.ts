import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import { LIMITS } from '../config';
import { createLogger } from '../logger';
import { EventLogEntrySchema, type EventLogEntry } from '../schemas/events';
import { HintSchema, type Hint } from '../schemas/hints';
import {
  TopicMasteryItemSchema,
  BanditBucketStatsSchema,
  type TopicMasteryItem,
  type BanditBucketStats,
  type Mastery,
  type BanditStats
} from '../schemas/mastery';

const logger = createLogger('IndexedDB');

export const DB_NAME = 'unstuck_db';
export const DB_VERSION = 1;

export interface StoredHint {
  id: string;
  problemHash: string;
  timestamp: number;
  hint: Hint;
}

export interface StoredMasteryRecord extends TopicMasteryItem {
  topic: string;
  updatedAt: number;
}

export interface StoredBanditRecord extends BanditBucketStats {
  bucket: string;
  updatedAt: number;
}

export interface UnstuckDBSchema extends DBSchema {
  events: {
    key: string;
    value: EventLogEntry;
    indexes: {
      by_timestamp: number;
    };
  };
  hints: {
    key: string;
    value: StoredHint;
    indexes: {
      by_problem: string;
      by_timestamp: number;
    };
  };
  mastery: {
    key: string;
    value: StoredMasteryRecord;
  };
  bandit: {
    key: string;
    value: StoredBanditRecord;
  };
}

let dbInstance: IDBPDatabase<UnstuckDBSchema> | null = null;

export async function getDb(): Promise<IDBPDatabase<UnstuckDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<UnstuckDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, _transaction) {
      logger.info(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);

      if (oldVersion < 1) {
        // 1. Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('by_timestamp', 'timestamp');
        }

        // 2. Hints store
        if (!db.objectStoreNames.contains('hints')) {
          const hintStore = db.createObjectStore('hints', { keyPath: 'id' });
          hintStore.createIndex('by_problem', 'problemHash');
          hintStore.createIndex('by_timestamp', 'timestamp');
        }

        // 3. Mastery store
        if (!db.objectStoreNames.contains('mastery')) {
          db.createObjectStore('mastery', { keyPath: 'topic' });
        }

        // 4. Bandit store
        if (!db.objectStoreNames.contains('bandit')) {
          db.createObjectStore('bandit', { keyPath: 'bucket' });
        }
      }
    },
    blocked() {
      logger.warn('IndexedDB database upgrade blocked by other open connections');
    },
    blocking() {
      if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
      }
    },
    terminated() {
      dbInstance = null;
    },
  });

  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Trims oldest event log entries when exceeding the cap or facing quota limits.
 */
export async function trimOldestEvents(targetCount: number = LIMITS.MAX_EVENT_LOG_ENTRIES): Promise<number> {
  const db = await getDb();
  const tx = db.transaction('events', 'readwrite');
  const store = tx.objectStore('events');
  const total = await store.count();

  if (total <= targetCount) {
    await tx.done;
    return 0;
  }

  const toDelete = total - targetCount;
  let deletedCount = 0;
  const index = store.index('by_timestamp');
  let cursor = await index.openCursor();

  while (cursor && deletedCount < toDelete) {
    await cursor.delete();
    deletedCount++;
    cursor = await cursor.continue();
  }

  await tx.done;
  logger.info(`Trimmed ${deletedCount} oldest events to enforce cap of ${targetCount}`);
  return deletedCount;
}

/**
 * Adds an event log entry with schema validation, cap enforcement, and quota handling.
 */
export async function addEventLog(entry: EventLogEntry): Promise<void> {
  const validated = EventLogEntrySchema.parse(entry);
  const db = await getDb();

  try {
    await db.put('events', validated);
    const count = await db.count('events');
    if (count > LIMITS.MAX_EVENT_LOG_ENTRIES) {
      await trimOldestEvents(LIMITS.MAX_EVENT_LOG_ENTRIES);
    }
  } catch (err: unknown) {
    const isQuotaError =
      (err instanceof Error && (err.name === 'QuotaExceededError' || err.message.includes('quota'))) ||
      String(err).includes('quota');

    if (isQuotaError) {
      logger.warn('QuotaExceededError writing event. Triggering emergency trim (EC-010).');
      // Trim down to 75% of limit to free quota space
      const safeTarget = Math.floor(LIMITS.MAX_EVENT_LOG_ENTRIES * 0.75);
      await trimOldestEvents(safeTarget);
      // Retry once
      await db.put('events', validated);
    } else {
      throw err;
    }
  }
}

/**
 * Retrieves event log entries sorted by timestamp ascending, with corrupt-record filtering.
 */
export async function getEventLogs(limit?: number): Promise<EventLogEntry[]> {
  const db = await getDb();
  const rawList = await db.getAllFromIndex('events', 'by_timestamp');

  const validEntries: EventLogEntry[] = [];
  for (const raw of rawList) {
    const parsed = EventLogEntrySchema.safeParse(raw);
    if (parsed.success) {
      validEntries.push(parsed.data);
    } else {
      logger.warn('Corrupted event log entry detected and skipped', {
        id: (raw as { id?: string })?.id,
        issues: parsed.error.issues,
      });
    }
  }

  if (limit && limit > 0) {
    return validEntries.slice(-limit);
  }
  return validEntries;
}

/**
 * Stores a delivered hint record.
 */
export async function saveHintRecord(record: StoredHint): Promise<void> {
  HintSchema.parse(record.hint);
  const db = await getDb();
  await db.put('hints', record);
}

/**
 * Gets all hints for a specific problem hash.
 */
export async function getHintsForProblem(problemHash: string): Promise<StoredHint[]> {
  const db = await getDb();
  return db.getAllFromIndex('hints', 'by_problem', problemHash);
}

/**
 * Gets all stored hints across problems.
 */
export async function getAllHints(): Promise<StoredHint[]> {
  const db = await getDb();
  return db.getAll('hints');
}

/**
 * Saves topic mastery item with validation.
 */
export async function saveMasteryTopic(topic: string, data: TopicMasteryItem): Promise<void> {
  const validated = TopicMasteryItemSchema.parse(data);
  const db = await getDb();
  await db.put('mastery', {
    ...validated,
    topic,
    updatedAt: Date.now(),
  });
}

export const setTopicMastery = saveMasteryTopic;

/**
 * Retrieves mastery state for all topics.
 */
export async function getAllMastery(): Promise<Mastery> {
  const db = await getDb();
  const records = await db.getAll('mastery');
  const mastery: Mastery = {};

  for (const r of records) {
    const parsed = TopicMasteryItemSchema.safeParse(r);
    if (parsed.success) {
      mastery[r.topic] = parsed.data;
    } else {
      logger.warn(`Corrupted mastery record for topic "${r.topic}" ignored`);
    }
  }

  return mastery;
}

/**
 * Saves contextual bandit bucket stats.
 */
export async function saveBanditBucket(bucket: string, stats: BanditBucketStats): Promise<void> {
  const validated = BanditBucketStatsSchema.parse(stats);
  const db = await getDb();
  await db.put('bandit', {
    ...validated,
    bucket,
    updatedAt: Date.now(),
  });
}

/**
 * Retrieves all contextual bandit stats.
 */
export async function getAllBanditStats(): Promise<BanditStats> {
  const db = await getDb();
  const records = await db.getAll('bandit');
  const stats: BanditStats = {};

  for (const r of records) {
    const parsed = BanditBucketStatsSchema.safeParse(r);
    if (parsed.success) {
      stats[r.bucket] = parsed.data;
    } else {
      logger.warn(`Corrupted bandit record for bucket "${r.bucket}" ignored`);
    }
  }

  return stats;
}

/**
 * Updates a specific contextual bandit bucket with feedback deltas.
 */
export async function updateBanditBucket(
  bucket: string,
  delta: Partial<BanditBucketStats>
): Promise<BanditBucketStats> {
  const all = await getAllBanditStats();
  const current = all[bucket] || { accept: 0, dismiss: 0, ignore: 0, n: 0 };
  const updated: BanditBucketStats = {
    accept: Math.max(0, current.accept + (delta.accept || 0)),
    dismiss: Math.max(0, current.dismiss + (delta.dismiss || 0)),
    ignore: Math.max(0, current.ignore + (delta.ignore || 0)),
    n: Math.max(0, current.n + 1),
  };
  await saveBanditBucket(bucket, updated);
  return updated;
}

/**
 * Clears all object stores in the IndexedDB database.
 */
export async function clearAllIndexedDB(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['events', 'hints', 'mastery', 'bandit'], 'readwrite');
  await Promise.all([
    tx.objectStore('events').clear(),
    tx.objectStore('hints').clear(),
    tx.objectStore('mastery').clear(),
    tx.objectStore('bandit').clear(),
  ]);
  await tx.done;
  logger.info('IndexedDB database cleared entirely');
}
