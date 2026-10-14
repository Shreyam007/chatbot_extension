export interface SensitivePattern {
  id: string;
  category: string;
  pattern: string;
  description: string;
}

export const BUILTIN_SENSITIVE_PATTERNS: SensitivePattern[] = [
  {
    id: 'banking',
    category: 'Banking & Finance',
    pattern: '(?:chase|bankofamerica|wellsfargo|citi|capitalone|barclays|hsbc|fidelity|schwab|vanguard)\\.com|banking',
    description: 'Major retail and commercial banking portals',
  },
  {
    id: 'checkout',
    category: 'Payment Checkout',
    pattern: '(?:\\/checkout|\\/cart|\\/pay|\\/billing|stripe\\.com\\/pay|paypal\\.com)',
    description: 'E-commerce cart, checkout, and payment gateways',
  },
  {
    id: 'webmail',
    category: 'Webmail',
    pattern: '(?:mail\\.google\\.com|outlook\\.live\\.com|mail\\.yahoo\\.com|proton\\.me\\/mail)',
    description: 'Web-based email providers and inboxes',
  },
  {
    id: 'health',
    category: 'Health & Medical',
    pattern: '(?:mychart|healthportal|epic\\.com|cerner|kaiserpermanente)',
    description: 'Electronic health records and patient portals',
  },
  {
    id: 'government',
    category: 'Government & ID',
    pattern: '(?:\\.gov|login\\.gov|irs\\.gov|passport|ssa\\.gov)',
    description: 'Government agency and citizen identity services',
  },
  {
    id: 'passwords',
    category: 'Password Managers',
    pattern: '(?:1password\\.com|bitwarden\\.com|lastpass\\.com|dashlane\\.com)',
    description: 'Cloud password vaults and credential managers',
  },
];

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  matchedPattern?: string;
  category?: string;
}

/**
 * Checks whether a given URL matches any built-in or custom sensitive pattern.
 * Performs matching against both hostname and full URL string.
 */
export function isBlacklistedUrl(
  urlOrString: URL | string,
  customPatterns: string[] = []
): BlacklistCheckResult {
  let urlStr = '';
  let hostname = '';

  try {
    const parsed = typeof urlOrString === 'string' ? new URL(urlOrString) : urlOrString;
    urlStr = parsed.href;
    hostname = parsed.hostname;
  } catch {
    urlStr = String(urlOrString);
    hostname = urlStr;
  }

  // 1. Check built-in patterns
  for (const item of BUILTIN_SENSITIVE_PATTERNS) {
    try {
      const regex = new RegExp(item.pattern, 'i');
      if (regex.test(hostname) || regex.test(urlStr)) {
        return {
          isBlacklisted: true,
          matchedPattern: item.pattern,
          category: item.category,
        };
      }
    } catch {
      // Ignore invalid regex
    }
  }

  // 2. Check custom user patterns
  for (const pattern of customPatterns) {
    if (!pattern || !pattern.trim()) continue;
    try {
      const regex = new RegExp(pattern.trim(), 'i');
      if (regex.test(hostname) || regex.test(urlStr)) {
        return {
          isBlacklisted: true,
          matchedPattern: pattern,
          category: 'Custom Pattern',
        };
      }
    } catch {
      // Fallback simple substring
      if (urlStr.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          isBlacklisted: true,
          matchedPattern: pattern,
          category: 'Custom Pattern',
        };
      }
    }
  }

  return { isBlacklisted: false };
}
