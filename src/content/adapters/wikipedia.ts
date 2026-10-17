import type { PageAdapter, VerdictResult } from './types';
import type { PageContext } from '../../shared/schemas/context';
import type { PageSection } from '../../shared/retrieval/bm25';
import { createProblemHash } from './leetcode';
import { LIMITS } from '../../shared/config';
import { truncateToBudget, sanitizeSectionsBudget } from '../../shared/budget';
import { getActiveSelection } from '../extractor/readability';

const WIKIPEDIA_NOISE_SELECTORS = [
  '.mw-editsection',
  'sup.reference',
  '.reflist',
  '.references',
  '.navbox',
  '.vertical-navbox',
  '.sidebar',
  '.metadata',
  '.ambox',
  '.infobox-header-icon',
  '.noprint',
  '.mw-jump-link',
  '.mw-empty-elt',
  '.mw-indicators',
  'style',
  'script',
  'noscript',
  'table.toc',
  '#toc',
  '.toc',
  '.vector-menu',
  '.vector-header',
  '.vector-footer',
  '#footer',
];

const IGNORED_SECTIONS = new Set([
  'references',
  'see also',
  'external links',
  'further reading',
  'notes',
  'sources',
  'bibliography',
  'footnotes',
]);

export function isWikipediaUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return host === 'wikipedia.org' || host.endsWith('.wikipedia.org');
}

export function isWikipediaSpecialPage(url: URL): boolean {
  const p = url.pathname;
  if (
    p.startsWith('/wiki/Special:') ||
    p.startsWith('/wiki/Category:') ||
    p.startsWith('/wiki/File:') ||
    p.startsWith('/wiki/Help:') ||
    p.startsWith('/wiki/Template:') ||
    p.startsWith('/wiki/Talk:') ||
    p.startsWith('/wiki/Wikipedia:')
  ) {
    return true;
  }
  const action = url.searchParams.get('action');
  if (action === 'edit' || action === 'history' || action === 'submit') {
    return true;
  }
  return false;
}

export const wikipediaAdapter: PageAdapter = {
  name: 'wikipedia',

  matches(url: URL): boolean {
    return isWikipediaUrl(url);
  },

  detectContest(_url: URL, _doc: Document): boolean {
    return false;
  },

  detectVerdict(_doc: Document): VerdictResult | null {
    return null;
  },

  readEditorCode(_doc: Document): string | null {
    return null;
  },

  extractContext(doc: Document, url: URL): PageContext | null {
    try {
      const problemHash = createProblemHash(url.hostname, url.pathname);

      // 1. Extract title
      const headingEl = doc.querySelector('#firstHeading, .mw-first-heading, h1');
      const rawTitle = headingEl?.textContent?.trim() || doc.title || 'Wikipedia';
      const cleanTitle = rawTitle.replace(/\s*[-–—|•].*$/, '').trim() || rawTitle;

      // 2. Special / Restricted page guardrail
      if (isWikipediaSpecialPage(url)) {
        return {
          url: problemHash,
          site: 'generic',
          title: cleanTitle,
          statementText: '',
          tags: ['Wikipedia', 'Special Page'],
          isContest: false,
          detectedAt: Date.now(),
          contentType: 'general',
          sections: [],
          isSensitive: true,
          sensitiveReason: 'wikipedia_special_page',
          isSparse: true,
          adapterName: 'wikipedia',
        };
      }

      // 3. Locate content container
      const container =
        doc.querySelector('.mw-parser-output') ||
        doc.querySelector('#mw-content-text') ||
        doc.querySelector('#bodyContent') ||
        doc.querySelector('#content') ||
        doc.body;

      if (!container) {
        return null;
      }

      const clone = container.cloneNode(true) as Element;

      // 4. Clean noise elements
      for (const sel of WIKIPEDIA_NOISE_SELECTORS) {
        clone.querySelectorAll(sel).forEach((el) => el.remove());
      }

      // 5. Extract Infobox key facts if present
      const sections: PageSection[] = [];
      const infobox = clone.querySelector('.infobox');
      if (infobox) {
        const facts: string[] = [];
        const rows = infobox.querySelectorAll('tr');
        rows.forEach((row) => {
          const th = row.querySelector('th')?.textContent?.trim();
          const td = row.querySelector('td')?.textContent?.trim();
          if (th && td && th.length < 50 && td.length < 250) {
            const cleanKey = th.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
            const cleanVal = td.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
            if (cleanKey && cleanVal && cleanKey !== cleanVal) {
              facts.push(`- **${cleanKey}**: ${cleanVal}`);
            }
          }
        });
        if (facts.length > 0) {
          sections.push({
            id: 'sec-quick-facts',
            title: 'Quick Facts',
            text: facts.slice(0, 15).join('\n'),
          });
        }
        infobox.remove();
      }

      // 6. Extract sections and headings
      let currentSectionTitle = 'Overview';
      let currentSectionParagraphs: string[] = [];
      let skippingIgnoredSection = false;

      const flushSection = () => {
        if (skippingIgnoredSection) return;
        const text = currentSectionParagraphs.join('\n\n').trim();
        if (text.length > 0) {
          const sectionId = `sec-${sections.length + 1}-${currentSectionTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 30)}`;
          sections.push({
            id: sectionId,
            title: currentSectionTitle,
            text,
          });
        }
        currentSectionParagraphs = [];
      };

      // Query heading wrappers or direct headings
      const contentElements = clone.querySelectorAll(
        'h2, h3, h4, .mw-heading, p, pre, table.wikitable, ul, ol, dl, blockquote'
      );

      const seen = new Set<Element>();

      contentElements.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);

        const tag = el.tagName.toLowerCase();
        const isHeading =
          tag === 'h2' ||
          tag === 'h3' ||
          tag === 'h4' ||
          el.classList.contains('mw-heading');

        if (isHeading) {
          flushSection();
          // Extract heading text, removing any remaining [edit] or numbers
          let hText = el.textContent?.replace(/\[edit\]/gi, '').replace(/\s+/g, ' ').trim() || '';
          const normalizedHTitle = hText.toLowerCase();

          if (IGNORED_SECTIONS.has(normalizedHTitle)) {
            skippingIgnoredSection = true;
          } else {
            skippingIgnoredSection = false;
            currentSectionTitle = hText || 'Section';
          }
        } else if (!skippingIgnoredSection) {
          // If element is a table, simplify to clean markdown rows
          if (tag === 'table') {
            const rows = Array.from(el.querySelectorAll('tr')).slice(0, 15);
            const tableLines: string[] = [];
            rows.forEach((row) => {
              const cells = Array.from(row.querySelectorAll('th, td')).map((c) =>
                (c.textContent || '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim()
              );
              if (cells.length > 0) {
                tableLines.push(cells.join(' | '));
              }
            });
            if (tableLines.length > 0) {
              currentSectionParagraphs.push(tableLines.join('\n'));
            }
          } else if (tag === 'ul' || tag === 'ol') {
            // Lists: extract up to 15 items
            const items = Array.from(el.querySelectorAll('li')).slice(0, 15);
            const listLines = items
              .map((li) => (li.textContent || '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim())
              .filter((txt) => txt.length > 0)
              .map((txt) => `- ${txt}`);
            if (listLines.length > 0) {
              currentSectionParagraphs.push(listLines.join('\n'));
            }
          } else {
            // Paragraph, pre, blockquote, or dl
            const text = (el.textContent || '')
              .replace(/\[\d+\]/g, '')
              .replace(/\[citation needed\]/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            if (text.length > 15) {
              if (tag === 'pre') {
                currentSectionParagraphs.push(`\`\`\`\n${text}\n\`\`\``);
              } else {
                currentSectionParagraphs.push(text);
              }
            }
          }
        }
      });
      flushSection();

      // 7. Extract Tags
      const tags: string[] = [];
      const catLinks = doc.querySelectorAll('#mw-normal-catlinks ul li a');
      catLinks.forEach((a) => {
        const cat = a.textContent?.trim();
        if (cat && cat.length > 2 && cat.length < 35 && tags.length < 5) {
          tags.push(cat);
        }
      });
      if (tags.length === 0) {
        // Fallback to top section titles
        sections.slice(0, 4).forEach((s) => {
          if (s.title && s.title !== 'Overview' && s.title !== 'Quick Facts' && tags.length < 4) {
            tags.push(s.title);
          }
        });
      }

      // 8. Assemble statement text
      const selectedText = getActiveSelection(doc);
      let statementText = sections.map((s) => `## ${s.title}\n${s.text}`).join('\n\n');
      if (selectedText) {
        statementText = `[USER SELECTION]:\n"${selectedText}"\n\n${statementText}`;
      }

      const isSparse = statementText.trim().length < 60;
      const maxChars = LIMITS.MAX_STATEMENT_CHARS || 16000;
      const isTruncated = statementText.length > maxChars;
      statementText = truncateToBudget(
        statementText,
        maxChars,
        '\n\n[...Text truncated for token budget...]'
      );

      const boundedSections = sanitizeSectionsBudget(sections);

      return {
        url: problemHash,
        site: 'generic',
        title: cleanTitle,
        statementText,
        tags,
        isContest: false,
        detectedAt: Date.now(),
        contentType: 'general',
        sections: boundedSections,
        selectedText,
        isSensitive: false,
        isSparse,
        language: doc.documentElement?.lang || 'en',
        statementLength: statementText.length,
        adapterName: 'wikipedia',
        isTruncated,
      };
    } catch {
      return null;
    }
  },
};
