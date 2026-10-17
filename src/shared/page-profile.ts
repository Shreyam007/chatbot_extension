/**
 * Page Profile - One Source of Truth for Page Behavior, Labels, and Capabilities
 * (Part A of v1.0.8 "PAGE-AWARE")
 */

import type { PageContext } from './schemas/context';

export type PageKind =
  | 'coding_problem'
  | 'documentation'
  | 'article'
  | 'pdf'
  | 'general'
  | 'restricted'
  | 'none';

export interface PageProfile {
  kind: PageKind;
  sourceName: string;
  sourceLabel?: string;
  contextLabel: string;
  showLevels: boolean;
  showHintsTab: boolean;
  chips: string[];
  placeholder: string;
  emptyStateTitle: string;
  emptyStateBody: string;
  promptVariant: 'coding_ladder' | 'direct_grounded' | 'standalone';
  nudgesAllowedByDefault: boolean;
  groundingMode: 'problem_scaffold' | 'page_sections' | 'none';
}

/**
 * Normalizes a URL to a key suitable for per-page state maps.
 */
export function hashUrl(url?: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return String(url);
  }
}

export interface TabInfo {
  url?: string;
  title?: string;
  tabId?: number;
}

const KNOWN_CODING_DOMAINS = [
  'leetcode.com',
  'codeforces.com',
  'hackerrank.com',
  'codechef.com',
  'atcoder.jp',
  'geeksforgeeks.org',
];

const KNOWN_SITE_NAMES: Record<string, string> = {
  'leetcode.com': 'LeetCode',
  'codeforces.com': 'Codeforces',
  'hackerrank.com': 'HackerRank',
  'codechef.com': 'CodeChef',
  'atcoder.jp': 'AtCoder',
  'geeksforgeeks.org': 'GeeksforGeeks',
  'developer.mozilla.org': 'MDN',
};

/**
 * Extracts a friendly source name from a URL or hostname.
 */
export function getSourceName(url?: string): string {
  if (!url) return 'Unknown';
  if (url.includes('wikipedia.org')) {
    return 'Wikipedia';
  }
  if (url.includes('developer.mozilla.org') || url.includes('.mozilla.org')) {
    return 'MDN';
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Check Wikipedia specifically across subdomains (en.wikipedia.org, hi.wikipedia.org, etc.)
    if (host.includes('wikipedia.org') || host.endsWith('.wikipedia.org')) {
      return 'Wikipedia';
    }

    // Check MDN
    if (host === 'developer.mozilla.org' || host.endsWith('.mozilla.org')) {
      return 'MDN';
    }

    // Check known site names
    for (const [domain, name] of Object.entries(KNOWN_SITE_NAMES)) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return name;
      }
    }

    // PDF viewer
    if (isPdfUrl(url)) {
      return 'PDF';
    }

    // Strip 'www.' if present
    return host.replace(/^www\./, '');
  } catch {
    return 'Web page';
  }
}

/**
 * Checks if a URL represents a PDF document.
 */
export function isPdfUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const clean = url.split('?')[0]?.split('#')[0]?.toLowerCase() || '';
    if (clean.endsWith('.pdf')) return true;
    if (url.startsWith('chrome-extension://') && url.includes('pdf')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL is a browser-restricted or extension-internal scheme.
 */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('view-source:') ||
    lower.startsWith('devtools://')
  );
}

/**
 * Derives the canonical PageProfile from active PageContext or TabInfo.
 * This is the SINGLE SOURCE OF TRUTH across SidePanel, Popup, Overlay, and Background.
 */
export function getPageProfile(
  input: PageContext | TabInfo | null | undefined,
  fallbackUrl?: string
): PageProfile {
  const url = input?.url || fallbackUrl;
  if (!url) {
    return {
      kind: 'none',
      sourceName: 'No Page',
      sourceLabel: 'No Page',
      contextLabel: 'No readable page',
      showLevels: false,
      showHintsTab: false,
      chips: ['Ask general question'],
      placeholder: 'Ask a general question or paste text...',
      emptyStateTitle: 'No page context detected',
      emptyStateBody: 'Ask a general question below or paste an excerpt to analyze.',
      promptVariant: 'standalone',
      nudgesAllowedByDefault: false,
      groundingMode: 'none',
    };
  }

  // 1. Check for Restricted schemes
  if (isRestrictedUrl(url)) {
    return {
      kind: 'restricted',
      sourceName: 'System',
      sourceLabel: 'System',
      contextLabel: 'Restricted page',
      showLevels: false,
      showHintsTab: false,
      chips: ['Ask general question'],
      placeholder: 'Ask a general question (not based on this page)...',
      emptyStateTitle: 'Restricted browser page',
      emptyStateBody: 'Unstuck cannot access browser internal or extension pages per security policies.',
      promptVariant: 'standalone',
      nudgesAllowedByDefault: false,
      groundingMode: 'none',
    };
  }

  // 2. Check for PDF document
  if (isPdfUrl(url)) {
    return {
      kind: 'pdf',
      sourceName: 'PDF',
      sourceLabel: 'PDF',
      contextLabel: 'PDF - Not readable',
      showLevels: false,
      showHintsTab: false,
      chips: ['Paste text to ask about', 'Ask general question'],
      placeholder: 'Paste text or ask a general question...',
      emptyStateTitle: "Unstuck can't read PDFs in the browser yet",
      emptyStateBody: 'You can paste an excerpt below to analyze, or ask a general question.',
      promptVariant: 'standalone',
      nudgesAllowedByDefault: false,
      groundingMode: 'none',
    };
  }

  const sourceName = getSourceName(url);
  const context = input && 'statementText' in input ? (input as PageContext) : null;

  // 3. Determine if Coding Problem
  let isProblem = false;
  let parsedHost = '';
  try {
    parsedHost = new URL(url).hostname.toLowerCase();
  } catch {
    // Ignore
  }

  if (url.includes('/blog/') || url.includes('/discuss/')) {
    isProblem = false;
  } else if (context?.site === 'leetcode' || context?.site === 'codeforces') {
    isProblem = true;
  } else if (KNOWN_CODING_DOMAINS.some((d) => parsedHost === d || parsedHost.endsWith(`.${d}`))) {
    // If on a known coding site and not explicitly an article/blog
    if (context?.contentType !== 'article' && context?.contentType !== 'documentation') {
      isProblem = true;
    }
  } else if (context?.contentType === 'problem') {
    isProblem = true;
  }

  if (isProblem) {
    return {
      kind: 'coding_problem',
      sourceName,
      sourceLabel: sourceName,
      contextLabel: `${sourceName} - Problem`,
      showLevels: true,
      showHintsTab: true,
      chips: ['Explain this problem', 'Give me a direction', 'Check my approach'],
      placeholder: 'Ask a question about this problem...',
      emptyStateTitle: 'Ask me anything about this problem.',
      emptyStateBody: "I'll give progressive hints, not code dumps. Problem context and constraints are indexed.",
      promptVariant: 'coding_ladder',
      nudgesAllowedByDefault: true,
      groundingMode: 'problem_scaffold',
    };
  }

  // 4. Determine if Documentation
  const isDoc =
    context?.contentType === 'documentation' ||
    sourceName === 'MDN' ||
    parsedHost.includes('docs.') ||
    url.includes('/docs/') ||
    url.includes('/documentation/');

  if (isDoc) {
    return {
      kind: 'documentation',
      sourceName,
      sourceLabel: sourceName,
      contextLabel: `${sourceName} - Documentation`,
      showLevels: false,
      showHintsTab: false,
      chips: ['Summarize this page', 'Explain this section', 'What are the key points?'],
      placeholder: 'Ask a question about this page...',
      emptyStateTitle: 'Ask me anything about this documentation.',
      emptyStateBody: 'I answer your questions directly from this page, at whatever depth or format you need.',
      promptVariant: 'direct_grounded',
      nudgesAllowedByDefault: false,
      groundingMode: 'page_sections',
    };
  }

  // 5. Determine if Article (Wikipedia, Blog, News)
  const isArticle =
    context?.contentType === 'article' ||
    sourceName === 'Wikipedia' ||
    url.includes('wikipedia.org') ||
    url.includes('/wiki/') ||
    url.includes('/article/') ||
    url.includes('/blog/');

  if (isArticle) {
    return {
      kind: 'article',
      sourceName,
      sourceLabel: sourceName,
      contextLabel: `${sourceName} - Article`,
      showLevels: false,
      showHintsTab: false,
      chips: ['Summarize this page', 'Key facts', 'Explain in simple words'],
      placeholder: 'Ask a question about this page...',
      emptyStateTitle: 'Ask me anything about this article.',
      emptyStateBody: 'I answer your questions directly from this page, at whatever depth or format you need.',
      promptVariant: 'direct_grounded',
      nudgesAllowedByDefault: false,
      groundingMode: 'page_sections',
    };
  }

  // 6. General Web Page Fallback
  return {
    kind: 'general',
    sourceName,
    sourceLabel: sourceName,
    contextLabel: `${sourceName} - Web page`,
    showLevels: false,
    showHintsTab: false,
    chips: ['Summarize this page', 'Explain this section', 'Key takeaways'],
    placeholder: 'Ask a question about this page...',
    emptyStateTitle: 'Ask me anything about this page.',
    emptyStateBody: 'I answer your questions directly from this page, at whatever depth or format you need.',
    promptVariant: 'direct_grounded',
    nudgesAllowedByDefault: false,
    groundingMode: 'page_sections',
  };
}
