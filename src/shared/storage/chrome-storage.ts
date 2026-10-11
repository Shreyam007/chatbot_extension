import { createLogger } from '../logger';
import { SettingsSchema, type Settings } from '../schemas/settings';
import { OnboardingStateSchema, type OnboardingState, DEFAULT_ONBOARDING_STATE } from '../schemas/onboarding';
import { DEFAULT_SETTINGS } from '../config';

const logger = createLogger('ChromeStorage');

// In-memory fallbacks for unit tests or environments without chrome.storage
const memoryLocal = new Map<string, unknown>();
const memorySession = new Map<string, unknown>();

function hasChromeLocalStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

function hasChromeSessionStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.session);
}

/**
 * Reads user settings with strict Zod validation.
 * If settings are corrupted, resets ONLY the settings record to default and logs a warning (EC-010).
 */
export async function getStoredSettings(): Promise<Settings> {
  let raw: unknown = null;

  if (hasChromeLocalStorage()) {
    const res = await chrome.storage.local.get(['settings']);
    raw = res?.settings;
  } else {
    raw = memoryLocal.get('settings');
  }

  if (raw === undefined || raw === null) {
    return DEFAULT_SETTINGS;
  }

  const parsed = SettingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  logger.warn('Corrupted settings detected; resetting only settings record to defaults', {
    errors: parsed.error.issues,
  });

  // Reset only settings in storage
  await setStoredSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

/**
 * Saves user settings updates with validation.
 */
export async function setStoredSettings(settings: Settings): Promise<void> {
  const validated = SettingsSchema.parse(settings);

  if (hasChromeLocalStorage()) {
    try {
      await chrome.storage.local.set({ settings: validated });
    } catch (err: unknown) {
      logger.error('Failed to write settings to chrome.storage.local:', err);
      throw err;
    }
  } else {
    memoryLocal.set('settings', validated);
  }
}

/**
 * Retrieves the Google Gemini API key.
 * Never leaks to exports or content scripts.
 */
export async function getStoredApiKey(): Promise<string> {
  if (hasChromeLocalStorage()) {
    const res = await chrome.storage.local.get(['apiKey']);
    return typeof res?.apiKey === 'string' ? res.apiKey : '';
  }
  return typeof memoryLocal.get('apiKey') === 'string' ? (memoryLocal.get('apiKey') as string) : '';
}

/**
 * Stores the Google Gemini API key securely in chrome.storage.local.
 */
export async function setStoredApiKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set({ apiKey: trimmed });
  } else {
    memoryLocal.set('apiKey', trimmed);
  }
}

/**
 * Reads onboarding state with validation and corrupt record recovery.
 */
export async function getStoredOnboardingState(): Promise<OnboardingState> {
  let raw: unknown = null;

  if (hasChromeLocalStorage()) {
    const res = await chrome.storage.local.get(['onboarding_state']);
    raw = res?.onboarding_state;
  } else {
    raw = memoryLocal.get('onboarding_state');
  }

  if (raw === undefined || raw === null) {
    return DEFAULT_ONBOARDING_STATE;
  }

  const parsed = OnboardingStateSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }

  logger.warn('Corrupted onboarding_state detected; resetting only onboarding record to defaults');
  await setStoredOnboardingState(DEFAULT_ONBOARDING_STATE);
  return DEFAULT_ONBOARDING_STATE;
}

/**
 * Saves onboarding state.
 */
export async function setStoredOnboardingState(state: OnboardingState): Promise<void> {
  const validated = OnboardingStateSchema.parse(state);
  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set({ onboarding_state: validated });
  } else {
    memoryLocal.set('onboarding_state', validated);
  }
}

/**
 * Reads an ephemeral runtime record from chrome.storage.session.
 */
export async function getSessionRecord<T>(key: string): Promise<T | null> {
  if (hasChromeSessionStorage()) {
    const res = await chrome.storage.session.get([key]);
    return (res?.[key] as T) ?? null;
  }
  return (memorySession.get(key) as T) ?? null;
}

/**
 * Writes an ephemeral runtime record to chrome.storage.session.
 */
export async function setSessionRecord<T>(key: string, value: T): Promise<void> {
  if (hasChromeSessionStorage()) {
    await chrome.storage.session.set({ [key]: value });
  } else {
    memorySession.set(key, value);
  }
}

/**
 * Completely clears chrome.storage.local.
 */
export async function clearChromeLocalStorage(): Promise<void> {
  if (hasChromeLocalStorage()) {
    await chrome.storage.local.clear();
  }
  memoryLocal.clear();
  logger.info('chrome.storage.local cleared');
}

/**
 * Completely clears chrome.storage.session.
 */
export async function clearChromeSessionStorage(): Promise<void> {
  if (hasChromeSessionStorage()) {
    await chrome.storage.session.clear();
  }
  memorySession.clear();
  logger.info('chrome.storage.session cleared');
}

/**
 * Test helper for simulating corrupted records in local storage.
 */
export async function _setRawLocalStorageForTesting(key: string, value: unknown): Promise<void> {
  if (hasChromeLocalStorage()) {
    await chrome.storage.local.set({ [key]: value });
  }
  memoryLocal.set(key, value);
}
