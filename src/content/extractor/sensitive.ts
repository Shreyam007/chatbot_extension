import { isBlacklistedUrl } from '../../shared/sensitive';

export interface SensitivePageCheck {
  isSensitive: boolean;
  reason?: string;
  category?: string;
}

/**
 * Checks whether the current document or URL is considered sensitive.
 * If sensitive, page extraction must abort immediately to protect user privacy.
 */
export function checkSensitivePage(
  doc: Document,
  url: URL | string,
  customPatterns: string[] = []
): SensitivePageCheck {
  // 1. URL pattern check (Banking, Health, Checkout, Webmail, Gov, Password Managers)
  const urlCheck = isBlacklistedUrl(url, customPatterns);
  if (urlCheck.isBlacklisted) {
    return {
      isSensitive: true,
      reason: `Blocked by sensitive site category (${urlCheck.category || 'Restricted category'}). Extraction aborted.`,
      category: urlCheck.category,
    };
  }

  // 2. Strict password input check
  try {
    const passwordInput = doc.querySelector('input[type="password"]');
    if (passwordInput) {
      return {
        isSensitive: true,
        reason: 'Page contains a password field. Extraction aborted for privacy protection.',
        category: 'Authentication',
      };
    }
  } catch {
    // Defensive
  }

  // 3. Login, Auth, and Checkout form signatures
  try {
    const loginFormSelectors = [
      'form[action*="login" i]',
      'form[action*="signin" i]',
      'form[action*="auth" i]',
      'form[action*="checkout" i]',
      'form[action*="payment" i]',
      'input[autocomplete="current-password" i]',
      'input[autocomplete="new-password" i]',
      'input[autocomplete*="cc-" i]',
      'input[name*="password" i]',
      'input[name*="cvv" i]',
      'input[name*="creditcard" i]',
    ];

    for (const selector of loginFormSelectors) {
      const match = doc.querySelector(selector);
      if (match) {
        return {
          isSensitive: true,
          reason: 'Page contains login, authentication, or payment forms. Extraction aborted for privacy protection.',
          category: 'Sensitive Form',
        };
      }
    }
  } catch {
    // Defensive
  }

  return { isSensitive: false };
}

/**
 * Strips all interactive form fields, inputs, contenteditable elements,
 * textareas, and password fields from a cloned container so user input
 * is NEVER read or sent to the AI.
 */
export function sanitizeFormInputs(container: Element): void {
  const elementsToRemove = container.querySelectorAll(
    'input, textarea, select, option, button, [contenteditable="true"], [contenteditable=""], [role="textbox"], dialog, [aria-modal="true"]'
  );
  elementsToRemove.forEach((el) => {
    el.remove();
  });
}
