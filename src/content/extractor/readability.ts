import { sanitizeFormInputs } from './sensitive';
import type { PageSection } from '../../shared/retrieval/bm25';
import { LIMITS } from '../../shared/config';

export interface ExtractedPageContent {
  title: string;
  statementText: string;
  sections: PageSection[];
  selectedText?: string;
  isSparse: boolean;
  language?: string;
  rawWordCount: number;
  isTruncated?: boolean;
}

const NOISE_SELECTORS = [
  'nav',
  'header',
  'footer',
  'aside',
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'video',
  'audio',
  '.ad',
  '.ads',
  '.ad-container',
  '.advertisement',
  '.sidebar',
  '.cookie-banner',
  '.cookie-notice',
  '.consent-banner',
  '.social-share',
  '.share-buttons',
  '.breadcrumbs',
  '.breadcrumb',
  '.mw-editsection',
  '.navbox',
  '.vector-header',
  '.vector-toc',
  '.noprint',
  '#footer',
  '#site-navigation',
];

/**
 * Extracts the user's active text selection, if any.
 */
export function getActiveSelection(doc: Document): string | undefined {
  try {
    const sel = doc.defaultView?.getSelection()?.toString().trim();
    if (sel && sel.length >= 10) {
      return sel;
    }
  } catch {
    // Best-effort
  }
  return undefined;
}

/**
 * Extracts semantic title from document, stripping site branding.
 */
export function extractTitle(doc: Document): string {
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  if (ogTitle && ogTitle.trim()) {
    return ogTitle.trim();
  }

  const h1 = doc.querySelector('h1')?.textContent?.trim();
  if (h1 && h1.length > 0 && h1.length <= 150) {
    return h1;
  }

  const rawTitle = doc.title || 'Web Document';
  // Strip trailing " - Wikipedia", " | MDN", etc.
  return rawTitle.replace(/\s*[-–—|•].*$/, '').trim() || rawTitle.trim();
}

/**
 * Finds the most likely main content container element.
 */
export function findMainContainer(doc: Document): Element {
  const candidates = [
    'article',
    '[role="main"]',
    'main',
    '.mw-parser-output', // Wikipedia
    '.article-body',
    '.post-content',
    '.entry-content',
    '.documentation',
    '.doc-content',
    '#content',
    '.content',
    'body',
  ];

  for (const selector of candidates) {
    const el = doc.querySelector(selector);
    if (el && (el.textContent?.trim().length || 0) > 100) {
      return el;
    }
  }

  return doc.body;
}

/**
 * Extracts readable main content from the document with section chunking,
 * noise removal, form sanitization, accordion/FAQ ingestion, and selection prioritization.
 */
export function extractReadabilityContent(doc: Document): ExtractedPageContent {
  const title = extractTitle(doc);
  const selectedText = getActiveSelection(doc);
  const lang = doc.documentElement?.lang || doc.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') || 'en';

  const mainContainer = findMainContainer(doc);
  if (!mainContainer) {
    return {
      title,
      statementText: '',
      sections: [],
      selectedText,
      isSparse: true,
      language: lang,
      rawWordCount: 0,
      isTruncated: false,
    };
  }

  // Clone container so live page DOM is never mutated
  const clone = mainContainer.cloneNode(true) as Element;

  // 1. Remove noise elements (ads, nav, footer, banners)
  for (const sel of NOISE_SELECTORS) {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // 2. Sanitize form inputs (passwords, textareas, inputs, editable regions)
  sanitizeFormInputs(clone);

  // 3. Process same-origin iframes cleanly (ignore cross-origin iframes safely)
  const iframes = doc.querySelectorAll('iframe');
  const iframeTexts: string[] = [];
  iframes.forEach((iframe) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc && iframeDoc.body) {
        const text = iframeDoc.body.textContent?.trim();
        if (text && text.length > 50 && text.length < 5000) {
          iframeTexts.push(text);
        }
      }
    } catch {
      // Cross-origin access blocked by browser CORS policy -> cleanly skip
    }
  });

  // 4. Section Chunking by Headings (h1 - h4, summary, dt, accordion triggers)
  const sections: PageSection[] = [];
  let currentSectionTitle = title || 'Overview';
  let currentSectionParagraphs: string[] = [];

  const flushSection = () => {
    const text = currentSectionParagraphs.join('\n\n').trim();
    if (text.length > 0) {
      sections.push({
        id: `sec-${sections.length + 1}-${currentSectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
        title: currentSectionTitle,
        text,
      });
    }
    currentSectionParagraphs = [];
  };

  const isHeadingOrTrigger = (el: Element): boolean => {
    const tag = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'summary', 'dt'].includes(tag)) {
      return true;
    }
    const cls = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
    if (cls.includes('accordion-header') || cls.includes('accordion-trigger') || cls.includes('faq-question')) {
      return true;
    }
    if (el.hasAttribute('aria-expanded') && (tag === 'button' || tag === 'a')) {
      return true;
    }
    return false;
  };

  const blockElements = clone.querySelectorAll(
    'h1, h2, h3, h4, summary, dt, dd, p, pre, code, ul, ol, table, blockquote, details .faq-body, .accordion-trigger, .accordion-header, .accordion-content, .faq-answer, [data-accordion-content]'
  );

  const seenNodes = new Set<Element>();

  if (blockElements.length > 0) {
    blockElements.forEach((el) => {
      if (seenNodes.has(el)) return;
      seenNodes.add(el);

      const tag = el.tagName.toLowerCase();
      if (isHeadingOrTrigger(el)) {
        flushSection();
        const headerText = el.textContent?.trim();
        if (headerText && headerText.length > 0) {
          currentSectionTitle = headerText;
        }
      } else {
        const text = el.textContent?.trim();
        if (text && text.length > 10) {
          if (tag === 'pre' || tag === 'code') {
            currentSectionParagraphs.push(`\`\`\`\n${text}\n\`\`\``);
          } else {
            currentSectionParagraphs.push(text);
          }
        }
      }
    });
    flushSection();
  }

  // Append any same-origin iframe content as a distinct section
  if (iframeTexts.length > 0) {
    sections.push({
      id: `sec-iframe-${sections.length + 1}`,
      title: 'Embedded Frame Content',
      text: iframeTexts.join('\n\n'),
    });
  }

  // Fallback if no structured blocks found: chunk whole text into 500-word sections
  if (sections.length === 0) {
    const rawAll = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (rawAll.length > 0) {
      const words = rawAll.split(' ');
      const chunkSize = 400;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        sections.push({
          id: `sec-chunk-${Math.floor(i / chunkSize) + 1}`,
          title: i === 0 ? title : `Part ${Math.floor(i / chunkSize) + 1}`,
          text: chunk,
        });
      }
    }
  }

  // Assemble consolidated statement text
  let statementText = sections.map((s) => `## ${s.title}\n${s.text}`).join('\n\n');

  // If user has selected text, prioritize it at the top
  if (selectedText) {
    statementText = `[USER SELECTION]:\n"${selectedText}"\n\n${statementText}`;
  }

  const rawWordCount = statementText.split(/\s+/).filter(Boolean).length;
  const isSparse = statementText.trim().length < 60;

  // Cap statement text length
  const maxChars = LIMITS.MAX_STATEMENT_CHARS || 16000;
  let isTruncated = false;
  if (statementText.length > maxChars) {
    isTruncated = true;
    statementText = statementText.slice(0, maxChars) + '\n\n[...Text truncated for token budget...]';
  }

  return {
    title,
    statementText,
    sections,
    selectedText,
    isSparse,
    language: lang,
    rawWordCount,
    isTruncated,
  };
}
