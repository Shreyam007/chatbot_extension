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

/**
 * Requests host permission at runtime for a given site.
 * Must be triggered by a user gesture.
 */
export async function requestSitePermission(site: string): Promise<boolean> {
  const origin = normalizeOriginPattern(site);
  if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.request) {
    logger.debug('chrome.permissions.request not available in current environment; simulating grant');
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
