import type { PageAdapter, VerdictResult } from './types';
import type { PageContext } from '../../shared/schemas/context';
import { LIMITS } from '../../shared/config';

export function createProblemHash(site: string, titleOrSlug: string): string {
  const normalized = titleOrSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  return `${site}:${normalized}`;
}

// In-memory cache for problem statements across SPA tab navigation
export const statementCache = new Map<
  string,
  { statementText: string; tags: string[]; difficulty?: 'Easy' | 'Medium' | 'Hard' }
>();

export function clearLeetCodeStatementCache(): void {
  statementCache.clear();
}

export function formatSlugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const leetcodeAdapter: PageAdapter = {
  name: 'leetcode',

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host.includes('leetcode.com') || host.includes('leetcode.cn');
  },

  detectContest(url: URL, doc: Document): boolean {
    const pathname = url.pathname.toLowerCase();
    if (pathname.includes('/contest/')) {
      return true;
    }
    // Check for contest banners or standing links
    if (doc.querySelector('a[href*="/contest/ranking/"]') || doc.querySelector('[data-track-load*="contest"]')) {
      return true;
    }
    return false;
  },

  extractContext(doc: Document, url: URL): PageContext | null {
    const isContest = this.detectContest(url, doc);

    // Extract problem slug from URL
    const slugMatch = url.pathname.match(/\/problems\/([^/]+)/);
    const slug = slugMatch ? slugMatch[1] : '';

    if (!slug) {
      return null;
    }

    const problemHash = createProblemHash('leetcode', slug);

    // 1. Extract problem title
    let title = '';
    const titleElem =
      doc.querySelector('.text-title-large') ||
      doc.querySelector('div[data-cy="question-title"]') ||
      doc.querySelector('div.text-lg.font-medium') ||
      doc.querySelector(`a[href*="/problems/${slug}"]`) ||
      doc.querySelector('h1');

    if (titleElem?.textContent?.trim()) {
      const rawTitle = titleElem.textContent.trim();
      // Ensure the title isn't a brand name or tab switcher title
      if (!/^(LeetCode|Solutions|Submissions|Editorial|Discussion)$/i.test(rawTitle)) {
        title = rawTitle;
      }
    }

    if (!title) {
      // Fallback from document title or URL slug
      const docTitle = doc.title || '';
      const cleaned = docTitle
        .replace(/\s*[-|]\s*LeetCode.*$/i, '')
        .replace(/^(Solutions|Submissions|Editorial|Discussion)\s*[-|]\s*/i, '')
        .trim();

      const isGenericLeetCodeTitle =
        !cleaned ||
        /^LeetCode(\b|:|-|\s)/i.test(cleaned) ||
        /world's leading|online programming/i.test(cleaned) ||
        /^(Solutions|Submissions|Editorial|Discussion)$/i.test(cleaned);

      if (!isGenericLeetCodeTitle) {
        title = cleaned;
      } else {
        title = formatSlugToTitle(slug);
      }
    }

    // 2. Extract difficulty
    let difficulty: 'Easy' | 'Medium' | 'Hard' | undefined = undefined;
    const diffElem =
      doc.querySelector('div[class*="text-difficulty-"]') ||
      doc.querySelector('.text-olive') ||
      doc.querySelector('.text-yellow') ||
      doc.querySelector('.text-pink') ||
      Array.from(doc.querySelectorAll('div, span')).find((el) => {
        const text = el.textContent?.trim();
        return text === 'Easy' || text === 'Medium' || text === 'Hard';
      });

    if (diffElem?.textContent) {
      const text = diffElem.textContent.trim();
      if (text === 'Easy' || text === 'Medium' || text === 'Hard') {
        difficulty = text;
      }
    }

    // 3. Extract topic tags
    const tags: string[] = [];
    const tagElements = doc.querySelectorAll('a[href*="/tag/"]');
    tagElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && !tags.includes(text)) {
        tags.push(text);
      }
    });

    // 4. Extract statement text
    let statementText = '';
    const contentElem =
      doc.querySelector('div[data-track-load="description_content"]') ||
      doc.querySelector('.elfjS') ||
      doc.querySelector('div.question-content') ||
      doc.querySelector('div[class*="content__u3I1"]');

    if (contentElem?.textContent?.trim()) {
      statementText = contentElem.textContent.trim();
    } else {
      // Fallback to searching paragraphs in main panel
      const paragraphs = Array.from(doc.querySelectorAll('div[data-key="description-content"] p, article p'));
      if (paragraphs.length > 0) {
        statementText = paragraphs.map((p) => p.textContent?.trim() || '').filter(Boolean).join('\n\n');
      }
    }

    if (statementText) {
      // Cache statement for subsequent SPA tabs (/solutions, /submissions)
      statementCache.set(problemHash, {
        statementText,
        tags: [...tags],
        difficulty,
      });
    } else {
      // Retrieve from cache if previously visited description tab
      const cached = statementCache.get(problemHash);
      if (cached) {
        statementText = cached.statementText;
        if (!difficulty) difficulty = cached.difficulty;
        if (tags.length === 0) tags.push(...cached.tags);
      } else {
        const isTab = /\/(solutions|submissions|editorial|discussion)/i.test(url.pathname);
        statementText = isTab
          ? `Problem: ${title} (LeetCode). Solutions/submissions tab is active.`
          : `Problem: ${title} (LeetCode). Description text loading...`;
      }
    }

    // Truncate statement text to token budget cap (EC-024)
    if (statementText.length > LIMITS.MAX_STATEMENT_CHARS) {
      statementText = statementText.slice(0, LIMITS.MAX_STATEMENT_CHARS) + '... [truncated]';
    }

    return {
      url: problemHash,
      site: 'leetcode',
      title,
      difficulty,
      statementText,
      statementLength: statementText.length,
      adapterName: 'leetcode',
      tags,
      isContest,
      detectedAt: Date.now(),
    };
  },

  detectVerdict(doc: Document): VerdictResult | null {
    // Look for recent submission result overlays or headers
    const verdictElem =
      doc.querySelector('span[data-e2e-locator="submission-result"]') ||
      doc.querySelector('div[class*="result__"] span') ||
      doc.querySelector('span[class*="text-green-"]') ||
      doc.querySelector('span[class*="text-red-"]');

    if (!verdictElem?.textContent) {
      return null;
    }

    const text = verdictElem.textContent.trim();
    if (/accepted/i.test(text)) {
      return { verdict: 'accepted', rawText: text };
    }
    if (/wrong answer|time limit|runtime error|compile error|memory limit/i.test(text)) {
      return { verdict: 'wrong', rawText: text };
    }
    if (/pending|judging/i.test(text)) {
      return { verdict: 'pending', rawText: text };
    }

    return null;
  },

  readEditorCode(doc: Document): string | null {
    // Best effort Monaco line reader
    const lineElements = doc.querySelectorAll('.monaco-editor .view-line');
    if (lineElements.length > 0) {
      const lines = Array.from(lineElements).map((el) => el.textContent || '');
      return lines.join('\n');
    }

    // Textarea fallback
    const textarea = doc.querySelector('textarea.monaco-mouse-cursor-text') as HTMLTextAreaElement | null;
    if (textarea && textarea.value) {
      return textarea.value;
    }

    return null;
  },
};
