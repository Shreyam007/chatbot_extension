import type { PageAdapter, VerdictResult } from './types';
import type { PageContext } from '../../shared/schemas/context';
import { LIMITS } from '../../shared/config';
import { truncateToBudget } from '../../shared/budget';
import { createProblemHash } from './leetcode';

export const codeforcesAdapter: PageAdapter = {
  name: 'codeforces',

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return host.includes('codeforces.com') || host.includes('codeforces.net');
  },

  detectContest(url: URL, doc: Document): boolean {
    const pathname = url.pathname.toLowerCase();
    // Live standings or countdown pages
    if (pathname.includes('/standings') || pathname.includes('/countdown')) {
      return true;
    }
    // Check if the page has an active contest timer banner
    if (doc.querySelector('#contest-state-phase') || doc.querySelector('.countdown')) {
      return true;
    }
    return false;
  },

  extractContext(doc: Document, url: URL): PageContext | null {
    const isContest = this.detectContest(url, doc);

    // 1. Extract problem title
    const titleElem = doc.querySelector('.problem-statement .header .title') || doc.querySelector('h1');
    let title = titleElem?.textContent?.trim() || '';

    if (!title) {
      // Fallback from document title
      const docTitle = doc.title || '';
      const match = docTitle.match(/^([^-|]+)/);
      if (match && match[1]?.trim()) {
        title = match[1].trim();
      }
    }

    if (!title) {
      return null;
    }

    // 2. Extract statement text
    let statementText = '';
    const statementElem = doc.querySelector('.problem-statement');
    if (statementElem) {
      // Clone element to safely remove limits and sample tests from the pure description if present
      statementText = statementElem.textContent?.trim() || '';
    }

    if (statementText.length > LIMITS.MAX_STATEMENT_CHARS) {
      statementText = truncateToBudget(statementText, LIMITS.MAX_STATEMENT_CHARS);
    }

    // 3. Extract tags
    const tags: string[] = [];
    const tagElements = doc.querySelectorAll('.tag-box');
    tagElements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && !tags.includes(text)) {
        tags.push(text);
      }
    });

    const slugMatch = url.pathname.match(/\/problem(?:set\/problem)?\/([^/]+\/[^/]+)/);
    const slug = slugMatch && slugMatch[1] ? slugMatch[1] : title;
    const problemHash = createProblemHash('codeforces', slug);

    return {
      url: problemHash,
      site: 'codeforces',
      title,
      statementText,
      statementLength: statementText.length,
      adapterName: 'codeforces',
      tags,
      isContest,
      detectedAt: Date.now(),
    };
  },

  detectVerdict(doc: Document): VerdictResult | null {
    const verdictElem =
      doc.querySelector('.verdict-accepted') ||
      doc.querySelector('.verdict-rejected') ||
      doc.querySelector('.verdict-waiting') ||
      doc.querySelector('span[class*="verdict"]');

    if (!verdictElem?.textContent) {
      return null;
    }

    const text = verdictElem.textContent.trim();
    if (/accepted/i.test(text)) {
      return { verdict: 'accepted', rawText: text };
    }
    if (/wrong answer|time limit|memory limit|runtime error|compilation error/i.test(text)) {
      return { verdict: 'wrong', rawText: text };
    }
    if (/running|queue|waiting/i.test(text)) {
      return { verdict: 'pending', rawText: text };
    }

    return null;
  },

  readEditorCode(doc: Document): string | null {
    const textarea = doc.querySelector('textarea#sourceCodeTextarea') as HTMLTextAreaElement | null;
    if (textarea && textarea.value) {
      return textarea.value;
    }
    const aceEditor = doc.querySelector('.ace_content');
    if (aceEditor?.textContent) {
      return aceEditor.textContent;
    }
    return null;
  },
};
