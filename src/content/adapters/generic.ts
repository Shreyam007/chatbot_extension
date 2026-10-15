import type { PageAdapter, VerdictResult } from './types';
import type { PageContext } from '../../shared/schemas/context';
import { createProblemHash } from './leetcode';
import { checkSensitivePage } from '../extractor/sensitive';
import { classifyContentType } from '../extractor/classifier';
import { extractReadabilityContent } from '../extractor/readability';

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
      const problemHash = createProblemHash(url.hostname, url.pathname);

      // 1. Sensitive Page Guardrail: Abort extraction on auth, payment, password, or blacklisted domains
      const sensitiveCheck = checkSensitivePage(doc, url);
      if (sensitiveCheck.isSensitive) {
        return {
          url: problemHash,
          site: 'generic',
          title: doc.title || 'Sensitive Page',
          statementText: '',
          tags: [],
          isContest: false,
          detectedAt: Date.now(),
          contentType: 'general',
          sections: [],
          isSensitive: true,
          sensitiveReason: sensitiveCheck.reason,
          isSparse: false,
        };
      }

      // 2. Classify content type: 'problem' | 'documentation' | 'article' | 'general'
      const contentType = classifyContentType(doc, url);

      // 3. Extract readable main content and structured sections
      const extracted = extractReadabilityContent(doc);

      // Derive relevant category tags from section headings
      const derivedTags = extracted.sections
        .map((s) => s.title)
        .filter((t) => t && t.length > 2 && t.length < 35 && t !== extracted.title && t !== 'Overview')
        .slice(0, 4);

      return {
        url: problemHash,
        site: 'generic',
        title: extracted.title || 'Web Document',
        statementText: extracted.statementText,
        tags: derivedTags,
        isContest: false,
        detectedAt: Date.now(),
        contentType,
        sections: extracted.sections,
        selectedText: extracted.selectedText,
        isSensitive: false,
        isSparse: extracted.isSparse,
        language: extracted.language,
        statementLength: extracted.statementText.length,
        adapterName: 'generic',
      };
    } catch {
      // Defensive: never throw on unexpected DOM
      return null;
    }
  },

  detectVerdict(_doc: Document): VerdictResult | null {
    return null;
  },

  readEditorCode(_doc: Document): string | null {
    // Explicit guardrail: Never read textareas, inputs, or user code from arbitrary generic sites
    return null;
  },
};
