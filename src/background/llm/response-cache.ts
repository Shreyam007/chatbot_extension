import { createLogger } from '../../shared/logger';
import type { LlmResponse } from './types';

const logger = createLogger('ResponseCache');
const CACHE_STORAGE_KEY = 'unstuck_llm_response_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

export interface CachedResponseEntry<T = unknown> {
  response: LlmResponse<T>;
  timestamp: number;
}

// In-memory cache for ultra-fast hits, backed by chrome.storage.session
const memoryCache = new Map<string, CachedResponseEntry>();

/**
 * Normalizes input strings and builds a unique, collision-proof cache key.
 * Strictly isolates different contexts, levels, queries, modes, and models.
 */
export function createCacheKey(
  contextHash: string,
  level: number,
  prompt: string,
  mode: string,
  model: string
): string {
  const normHash = (contextHash || 'none').trim().toLowerCase();
  const normMode = (mode || 'page').trim().toLowerCase();
  const normModel = (model || 'default').trim().toLowerCase();
  const normPrompt = prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // collapse whitespace

  return `${normHash}::lvl${level}::${normMode}::${normModel}::${normPrompt}`;
}

/**
 * Retrieves a response from the session cache if present and unexpired.
 */
export async function getCachedResponse<T>(key: string): Promise<LlmResponse<T> | null> {
  const now = Date.now();

  // 1. Check memory cache
  const inMem = memoryCache.get(key);
  if (inMem) {
    if (now - inMem.timestamp <= CACHE_TTL_MS) {
      logger.debug(`Cache hit (memory): ${key.slice(0, 50)}...`);
      return inMem.response as LlmResponse<T>;
    }
    memoryCache.delete(key);
  }

  // 2. Check chrome.storage.session
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      const stored = await chrome.storage.session.get([CACHE_STORAGE_KEY]);
      const cacheObj = stored?.[CACHE_STORAGE_KEY] as Record<string, CachedResponseEntry> | undefined;
      const entry = cacheObj?.[key];

      if (entry && now - entry.timestamp <= CACHE_TTL_MS) {
        memoryCache.set(key, entry);
        logger.debug(`Cache hit (session storage): ${key.slice(0, 50)}...`);
        return entry.response as LlmResponse<T>;
      }
    } catch (err) {
      logger.debug('Failed to query session storage response cache:', err);
    }
  }

  return null;
}

/**
 * Stores a successful LLM response into the session cache.
 */
export async function setCachedResponse<T>(
  key: string,
  response: LlmResponse<T>
): Promise<void> {
  const entry: CachedResponseEntry<T> = {
    response,
    timestamp: Date.now(),
  };

  memoryCache.set(key, entry as CachedResponseEntry);

  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      const stored = await chrome.storage.session.get([CACHE_STORAGE_KEY]);
      const cacheObj = (stored?.[CACHE_STORAGE_KEY] || {}) as Record<string, CachedResponseEntry>;
      cacheObj[key] = entry as CachedResponseEntry;

      // Purge expired entries to maintain bounded size
      const now = Date.now();
      for (const [k, v] of Object.entries(cacheObj)) {
        if (now - v.timestamp > CACHE_TTL_MS) {
          delete cacheObj[k];
        }
      }

      await chrome.storage.session.set({ [CACHE_STORAGE_KEY]: cacheObj });
    } catch (err) {
      logger.debug('Failed to persist response cache entry:', err);
    }
  }
}

/**
 * Clears the entire response cache (e.g. on DELETE_ALL_DATA)
 */
export async function clearResponseCache(): Promise<void> {
  memoryCache.clear();
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    try {
      await chrome.storage.session.remove([CACHE_STORAGE_KEY]);
    } catch {
      // ignore
    }
  }
}
