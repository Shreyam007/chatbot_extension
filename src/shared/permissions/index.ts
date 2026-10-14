import { createLogger } from '../logger';

const logger = createLogger('Permissions');

export function normalizeOriginPattern(domainOrPattern: string): string {
  if (domainOrPattern.startsWith('http://') || domainOrPattern.startsWith('https://')) {
    if (domainOrPattern.endsWith('/*') || domainOrPattern.endsWith('*')) {
      return domainOrPattern;
    }
    return domainOrPattern.endsWith('/') ? `${domainOrPattern}*` : `${domainOrPattern}/*`;
  }
  return `https://${domainOrPattern}/*`;
}

export function extractOriginFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return urlStr;
  }
}

export function getScriptIdForOrigin(originPattern: string): string {
  return `unstuck-${originPattern.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45)}`;
}

/**
 * Requests host permission at runtime for a given site origin.
 * Must be triggered by a user gesture.
 */
export async function requestSitePermission(site: string): Promise<boolean> {
  const origin = normalizeOriginPattern(site);
  if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.request) {
    logger.debug('chrome.permissions.request not available; simulating grant');
    return true;
  }

  try {
    const granted = await chrome.permissions.request({ origins: [origin] });
    logger.info(`Permission request for ${origin} result:`, granted);
    return granted;
  } catch (err) {
    logger.error(`Failed to request permission for ${origin}:`, err);
    return false;
  }
}

/**
 * Checks whether the extension currently holds host permission for a site.
 */
export async function hasSitePermission(site: string): Promise<boolean> {
  const origin = normalizeOriginPattern(site);
  if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.contains) {
    return true;
  }

  try {
    return await chrome.permissions.contains({ origins: [origin] });
  } catch (err) {
    logger.warn(`Failed to check permission for ${origin}:`, err);
    return false;
  }
}

/**
 * Removes previously granted optional host permission.
 */
export async function removeSitePermission(site: string): Promise<boolean> {
  const origin = normalizeOriginPattern(site);
  if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.remove) {
    return true;
  }

  try {
    return await chrome.permissions.remove({ origins: [origin] });
  } catch (err) {
    logger.warn(`Failed to remove permission for ${origin}:`, err);
    return false;
  }
}

/**
 * Dynamically registers content script for a permanently allowed origin.
 * Persists across browser sessions until revoked.
 */
export async function registerOriginContentScript(originPattern: string): Promise<boolean> {
  const origin = normalizeOriginPattern(originPattern);
  const scriptId = getScriptIdForOrigin(origin);

  if (typeof chrome === 'undefined' || !chrome.scripting || !chrome.scripting.registerContentScripts) {
    logger.debug('chrome.scripting.registerContentScripts not available; simulating success');
    return true;
  }

  try {
    // Unregister existing script if previously registered to avoid duplicates
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
    } catch {
      // Ignored if not found
    }

    await chrome.scripting.registerContentScripts([
      {
        id: scriptId,
        matches: [origin],
        js: ['content-scripts/content.js'],
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);
    logger.info(`Registered dynamic content script for ${origin} (ID: ${scriptId})`);
    return true;
  } catch (err) {
    logger.warn(`Failed to register content script for ${origin}:`, err);
    return false;
  }
}

/**
 * Unregisters dynamic content script when user revokes site permission.
 */
export async function unregisterOriginContentScript(originPattern: string): Promise<boolean> {
  const origin = normalizeOriginPattern(originPattern);
  const scriptId = getScriptIdForOrigin(origin);

  if (typeof chrome === 'undefined' || !chrome.scripting || !chrome.scripting.unregisterContentScripts) {
    return true;
  }

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
    logger.info(`Unregistered dynamic content script for ${origin}`);
    return true;
  } catch (err) {
    logger.warn(`Failed to unregister content script for ${origin}:`, err);
    return false;
  }
}

/**
 * Injects content script into an active tab for single-use ("Use on this page once")
 * via activeTab permission and chrome.scripting.
 */
export async function executeScriptOnTabOnce(tabId: number): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.scripting || !chrome.scripting.executeScript) {
    logger.debug('chrome.scripting.executeScript not available; simulating success');
    return true;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js'],
    });
    logger.info(`Single-use content script successfully injected into tab ${tabId}`);
    return true;
  } catch (err) {
    logger.error(`Failed single-use script execution on tab ${tabId}:`, err);
    return false;
  }
}
