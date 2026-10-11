import type { PageAdapter, VerdictResult } from './types';
import type { PageContext } from '../../shared/schemas/context';
import { LIMITS } from '../../shared/config';
import { createProblemHash } from './leetcode';

export const genericAdapter: PageAdapter = {
  name: 'generic',

  matches(_url: URL): boolean {
    return true; // Fallback matches any URL
  },

  detectContest(_url: URL, _doc: Document): boolean {
    return false;
  },

  extractContext(doc: Document, url: URL): PageContext | null {
    try {
      const titleElem = doc.querySelector('h1') || doc.querySelector('h2');
      let title = titleElem?.textContent?.trim() || doc.title || '';

      if (title.length > 100) {
        title = title.slice(0, 100);
      }

      // Try main content containers
      const mainContainer =
        doc.querySelector('main') ||
        doc.querySelector('article') ||
        doc.querySelector('[role="main"]') ||
        doc.querySelector('.content') ||
        doc.body;

      if (!mainContainer) {
        return null;
      }

      // Collect paragraphs
      const paragraphs = Array.from(mainContainer.querySelectorAll('p, pre, code'));
      let statementText = paragraphs
        .map((p) => p.textContent?.trim() || '')
        .filter((t) => t.length > 20)
        .join('\n\n');

      if (!statementText && mainContainer.textContent) {
        statementText = mainContainer.textContent.trim();
      }

      if (statementText.length > LIMITS.MAX_STATEMENT_CHARS) {
        statementText = statementText.slice(0, LIMITS.MAX_STATEMENT_CHARS) + '... [truncated]';
      }

      if (!title && !statementText) {
        return null;
      }

      const problemHash = createProblemHash(url.hostname, title || url.pathname);

      return {
        url: problemHash,
        site: 'generic',
        title: title || 'Coding Problem',
        statementText,
        tags: [],
        isContest: false,
        detectedAt: Date.now(),
      };
    } catch {
      // Defensive: never throw on unexpected DOM
      return null;
    }
  },

  detectVerdict(_doc: Document): VerdictResult | null {
    return null;
  },

  readEditorCode(doc: Document): string | null {
    const preCode = doc.querySelector('pre code, textarea');
    return preCode?.textContent || null;
  },
};
