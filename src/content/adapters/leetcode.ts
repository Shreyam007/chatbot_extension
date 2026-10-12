import type { PageAdapter, VerdictResult } from './types';
import type { PageContext } from '../../shared/schemas/context';
import { LIMITS } from '../../shared/config';

export function createProblemHash(site: string, titleOrSlug: string): string {
  const normalized = titleOrSlug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  return `${site}:${normalized}`;
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

    // 1. Extract problem title
    let title = '';
    const titleElem =
      doc.querySelector('.text-title-large') ||
      doc.querySelector('div[data-cy="question-title"]') ||
      doc.querySelector('div.text-lg.font-medium') ||
      doc.querySelector('h1');

    if (titleElem?.textContent?.trim()) {
      title = titleElem.textContent.trim();
    } else {
      // Fallback from document title or URL slug
      const docTitle = doc.title || '';
      const match = docTitle.match(/^([^-|]+)/);
      if (match && match[1]?.trim()) {
        title = match[1].trim();
      } else {
        const slugMatch = url.pathname.match(/\/problems\/([^/]+)/);
        if (slugMatch && slugMatch[1]) {
          title = slugMatch[1].replace(/-/g, ' ');
        }
      }
    }

    if (!title) {
      return null;
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

    // 3. Extract statement text
    let statementText = '';
    const contentElem =
      doc.querySelector('div[data-track-load="description_content"]') ||
      doc.querySelector('.elfjS') ||
      doc.querySelector('div.question-content') ||
      doc.querySelector('div[class*="content__u3I1"]');

    if (contentElem?.textContent) {
      statementText = contentElem.textContent.trim();
    } else {
      // Fallback to searching paragraphs in main panel
      const paragraphs = Array.from(doc.querySelectorAll('div[data-key="description-content"] p, article p'));
      if (paragraphs.length > 0) {
        statementText = paragraphs.map((p) => p.textContent?.trim() || '').join('\n\n');
      }
    }

    // Truncate statement text to token budget cap (EC-024)
    if (statementText.length > LIMITS.MAX_STATEMENT_CHARS) {
      statementText = statementText.slice(0, LIMITS.MAX_STATEMENT_CHARS) + '... [truncated]';
    }

    // 4. Extract topic tags
    const tags: string[] = [];
    const tagElements = doc.querySelectorAll('a[href*="/tag/"]');
    tagElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && !tags.includes(text)) {
        tags.push(text);
      }
    });

    const slug = url.pathname.match(/\/problems\/([^/]+)/)?.[1] || title;
    const problemHash = createProblemHash('leetcode', slug);

    return {
      url: problemHash,
      site: 'leetcode',
      title,
      difficulty,
      statementText,
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
