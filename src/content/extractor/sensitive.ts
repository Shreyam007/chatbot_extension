import { isBlacklistedUrl } from '../../shared/sensitive';

export interface SensitivePageCheck {
  isSensitive: boolean;
  reason?: string;
  category?: string;
}

function isElementVisible(el: Element): boolean {
  if (el.closest('[aria-hidden="true"], [hidden], dialog:not([open])')) {
    return false;
  }
  const htmlEl = el as HTMLElement;
  if (htmlEl.style) {
    if (htmlEl.style.display === 'none' || htmlEl.style.visibility === 'hidden') {
      return false;
    }
  }
  const parent = htmlEl.closest('[style*="display: none"], [style*="visibility: hidden"], [style*="display:none"], [style*="visibility:hidden"]');
  if (parent) {
    return false;
  }
  if (typeof htmlEl.offsetParent !== 'undefined' && htmlEl.offsetParent === null) {
    if (typeof htmlEl.getClientRects === 'function' && htmlEl.getClientRects().length === 0) {
      return false;
    }
  }
  return true;
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

  // 2. Strict password input check (visible only)
  try {
    const passwordInputs = doc.querySelectorAll('input[type="password"]');
    for (const input of passwordInputs) {
      if (isElementVisible(input)) {
        return {
          isSensitive: true,
          reason: 'Page contains a password field. Extraction aborted for privacy protection.',
          category: 'Authentication',
        };
      }
    }
  } catch {
    // Defensive
  }

  // 3. Login, Auth, and Checkout form signatures (visible only)
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
      const matches = doc.querySelectorAll(selector);
      for (const match of matches) {
        if (isElementVisible(match)) {
          return {
            isSensitive: true,
            reason: 'Page contains login, authentication, or payment forms. Extraction aborted for privacy protection.',
            category: 'Sensitive Form',
          };
        }
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
 * Preserves accordion/FAQ buttons and disclosure triggers.
 */
export function sanitizeFormInputs(container: Element): void {
  const elementsToRemove = container.querySelectorAll(
    'input, textarea, select, option, [contenteditable="true"], [contenteditable=""], [role="textbox"], dialog, [aria-modal="true"]'
  );
  elementsToRemove.forEach((el) => {
    el.remove();
  });

  // For buttons: preserve accordion and FAQ triggers, remove regular action buttons
  const buttons = container.querySelectorAll('button');
  buttons.forEach((btn) => {
    const isAccordionOrFaq =
      btn.hasAttribute('aria-expanded') ||
      btn.hasAttribute('aria-controls') ||
      btn.closest('details') !== null ||
      /(accordion|faq)/i.test(btn.className || '') ||
      /(accordion|faq)/i.test(btn.id || '');

    if (!isAccordionOrFaq) {
      btn.remove();
    }
  });
}
