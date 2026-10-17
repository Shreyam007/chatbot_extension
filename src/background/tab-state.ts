import type { PageContext } from '../shared/schemas/context';
import type { SignalWindow } from '../shared/schemas/signals';
import type { PlannerState } from './planner/types';
import { createLogger } from '../shared/logger';

const logger = createLogger('TabStateManager');

export interface TabState {
  tabId: number;
  context: PageContext | null;
  signals: SignalWindow | null;
  pStuck: number;
  isPaused: boolean;
  lastUpdated: number;
}

const memoryTabs = new Map<number, TabState>();

let memoryPlannerState: PlannerState = {
  recentNudges: [],
  lastNudgeTime: 0,
  snoozeUntil: 0,
  blockedSites: [],
  sessionHistories: {},
};

let isRehydrated = false;

/**
 * Rehydrates per-tab state and planner state from chrome.storage.session
 * so state and cooldowns survive service worker sleeps (EC-004 & Task D.2).
 */
export async function rehydrateSessionState(): Promise<void> {
  if (isRehydrated) return;

  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const stored = await chrome.storage.session.get(['tab_states', 'planner_state']);
      if (stored?.tab_states && typeof stored.tab_states === 'object') {
        const entries = Object.entries(stored.tab_states as Record<string, TabState>);
        for (const [key, val] of entries) {
          const tabId = parseInt(key, 10);
          if (!isNaN(tabId) && val) {
            memoryTabs.set(tabId, val);
          }
        }
        logger.debug(`Rehydrated ${memoryTabs.size} tab states from chrome.storage.session`);
      }

      if (stored?.planner_state && typeof stored.planner_state === 'object') {
        memoryPlannerState = {
          ...memoryPlannerState,
          ...(stored.planner_state as PlannerState),
        };
        logger.debug('Rehydrated planner state from chrome.storage.session');
      }
    }
  } catch (err) {
    logger.warn('Failed to rehydrate session state from chrome.storage.session', err);
  } finally {
    isRehydrated = true;
  }
}

/**
 * Persists current tab states to chrome.storage.session
 */
async function persistTabStates(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const record: Record<string, TabState> = {};
      for (const [tabId, state] of memoryTabs.entries()) {
        record[String(tabId)] = state;
      }
      await chrome.storage.session.set({ tab_states: record });
    }
  } catch (err) {
    logger.info('Notice: Failed to persist tab states to session storage: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Gets state for a specific tab ID, rehydrating if needed
 */
export async function getTabState(tabId: number): Promise<TabState | undefined> {
  await rehydrateSessionState();
  return memoryTabs.get(tabId);
}

/**
 * Updates or creates state for a specific tab ID and persists to session storage
 */
export async function setTabState(
  tabId: number,
  updates: Partial<Omit<TabState, 'tabId'>>
): Promise<TabState> {
  await rehydrateSessionState();
  const existing = memoryTabs.get(tabId) || {
    tabId,
    context: null,
    signals: null,
    pStuck: 0,
    isPaused: false,
    lastUpdated: Date.now(),
  };

  const updated: TabState = {
    ...existing,
    ...updates,
    tabId,
    lastUpdated: Date.now(),
  };

  memoryTabs.set(tabId, updated);
  await persistTabStates();
  return updated;
}

/**
 * Deletes state when a tab is closed (EC-007)
 */
export async function removeTabState(tabId: number): Promise<void> {
  await rehydrateSessionState();
  if (memoryTabs.delete(tabId)) {
    await persistTabStates();
  }
}

/**
 * Gets the state for whichever tab is currently active in the focused browser window
 */
export async function getActiveTabState(): Promise<{ tabId?: number; state?: TabState }> {
  await rehydrateSessionState();

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      const isExtensionTab = activeTab?.url?.startsWith('chrome-extension://') || activeTab?.url?.startsWith('chrome://');
      const activeTabId = activeTab?.id;
      if (activeTabId !== undefined && !isExtensionTab) {
        const state = memoryTabs.get(activeTabId);
        if (state) {
          return {
            tabId: activeTabId,
            state,
          };
        }
      }
    }
  } catch (err) {
    logger.debug('Failed to query active tab for state lookup', err);
  }

  // Fallback: return most recently updated tab
  let mostRecent: TabState | undefined;
  for (const s of memoryTabs.values()) {
    if (!mostRecent || s.lastUpdated > mostRecent.lastUpdated) {
      mostRecent = s;
    }
  }

  return {
    tabId: mostRecent?.tabId,
    state: mostRecent,
  };
}

/**
 * Gets the current persisted planner state
 */
export async function getPlannerState(): Promise<PlannerState> {
  await rehydrateSessionState();
  return memoryPlannerState;
}

/**
 * Saves planner state and persists to chrome.storage.session
 */
export async function savePlannerState(state: PlannerState): Promise<void> {
  await rehydrateSessionState();
  memoryPlannerState = { ...state };

  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      await chrome.storage.session.set({ planner_state: memoryPlannerState });
    }
  } catch (err) {
    logger.warn('Failed to persist planner state to chrome.storage.session', err);
  }
}

/**
 * Clears in-memory tab state (useful for tests)
 */
export function resetTabStatesForTesting(): void {
  memoryTabs.clear();
  memoryPlannerState = {
    recentNudges: [],
    lastNudgeTime: 0,
    snoozeUntil: 0,
    blockedSites: [],
    sessionHistories: {},
  };
  isRehydrated = false;
}
