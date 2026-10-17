import { createLogger } from '../shared/logger';
import { normaliseForMatch, tokenizeForMatch } from '../shared/normalization';

const logger = createLogger('Highlighter');

export interface HighlightResult {
  found: boolean;
  matchedLength?: number;
  strategyUsed?: string;
}

interface WordSpan {
  word: string;
  node: Text;
  startOffset: number;
  endOffset: number;
}

/**
 * Ensures the document has the necessary CSS rules for custom highlights and fallback outlines.
 */
function ensureHighlightStyles(doc: Document): void {
  const STYLE_ID = 'unstuck-highlight-style';
  if (doc.getElementById(STYLE_ID)) return;
  try {
    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ::highlight(unstuck-grounding-highlight) {
        background-color: #22c55e44 !important;
        color: inherit !important;
        text-decoration: underline 2px #22c55e !important;
      }
      .unstuck-page-highlight {
        outline: 3px solid #22c55e !important;
        outline-offset: 2px !important;
        background-color: #22c55e22 !important;
        transition: outline 0.3s ease-in-out, background-color 0.3s ease-in-out !important;
      }
    `;
    (doc.head || doc.documentElement || doc.body)?.appendChild(style);
  } catch {
    // Best-effort
  }
}

/**
 * Expands any collapsed parent elements (<details>, aria-expanded accordions)
 * so the target content becomes visible to the user.
 */
function expandAncestors(el: Element): void {
  let curr: Element | null = el;
  while (curr && curr !== curr.ownerDocument?.body) {
    if (curr.tagName.toLowerCase() === 'details') {
      (curr as HTMLDetailsElement).open = true;
    }
    if (curr.getAttribute('aria-expanded') === 'false') {
      curr.setAttribute('aria-expanded', 'true');
    }
    curr = curr.parentElement;
  }
}

/**
 * Detailed text highlighter supporting multi-node spans, CSS Highlight API,
 * accordion expansion, and multi-strategy matching (exact, prefix window, token overlap).
 */
export function highlightTextInPageDetailed(
  searchText: string,
  doc: Document = document
): HighlightResult {
  if (!searchText || !doc.body) {
    return { found: false };
  }

  const queryWords = tokenizeForMatch(searchText);
  if (queryWords.length === 0) {
    return { found: false };
  }

  try {
    ensureHighlightStyles(doc);

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const wordSpans: WordSpan[] = [];
    let currentNode: Node | null;

    while ((currentNode = walker.nextNode())) {
      const textNode = currentNode as Text;
      const rawText = textNode.nodeValue || '';
      const wordRegex = /\S+/g;
      let match: RegExpExecArray | null;

      while ((match = wordRegex.exec(rawText)) !== null) {
        const rawWord = match[0];
        const cleanWord = normaliseForMatch(rawWord, { lowercase: true, stripCitations: true });
        if (cleanWord.length > 0) {
          wordSpans.push({
            word: cleanWord,
            node: textNode,
            startOffset: match.index,
            endOffset: match.index + rawWord.length,
          });
        }
      }
    }

    if (wordSpans.length === 0) {
      return { found: false };
    }

    let matchStartIndex = -1;
    let matchEndIndex = -1;
    let strategyUsed = '';

    // Strategy 1: Exact consecutive word sequence match
    const qLen = queryWords.length;
    for (let i = 0; i <= wordSpans.length - qLen; i++) {
      let match = true;
      for (let j = 0; j < qLen; j++) {
        const span = wordSpans[i + j];
        if (!span || span.word !== queryWords[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        matchStartIndex = i;
        matchEndIndex = i + qLen - 1;
        strategyUsed = 'exact_sequence';
        break;
      }
    }

    // Strategy 2: Prefix sliding window (first 6-8 words) if long query
    if (matchStartIndex === -1 && qLen > 5) {
      const prefixLen = Math.min(8, qLen);
      const prefixWords = queryWords.slice(0, prefixLen);
      for (let i = 0; i <= wordSpans.length - prefixLen; i++) {
        let match = true;
        for (let j = 0; j < prefixLen; j++) {
          const span = wordSpans[i + j];
          if (!span || span.word !== prefixWords[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          matchStartIndex = i;
          matchEndIndex = i + prefixLen - 1;
          strategyUsed = 'prefix_window';
          break;
        }
      }
    }

    // Strategy 3: Token overlap sliding window (>= 75% overlap, min 3 matching words)
    if (matchStartIndex === -1 && qLen >= 4) {
      const querySet = new Set(queryWords);
      let bestOverlap = 0;
      let bestIdx = -1;

      for (let i = 0; i <= wordSpans.length - qLen; i++) {
        let commonCount = 0;
        for (let j = 0; j < qLen; j++) {
          const span = wordSpans[i + j];
          if (span && querySet.has(span.word)) {
            commonCount++;
          }
        }
        const overlap = commonCount / qLen;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestIdx = i;
        }
      }

      if (bestOverlap >= 0.75 && bestIdx !== -1) {
        matchStartIndex = bestIdx;
        matchEndIndex = bestIdx + qLen - 1;
        strategyUsed = 'token_overlap';
      }
    }

    if (matchStartIndex === -1 || matchEndIndex === -1) {
      logger.debug('Highlight text not found using any matching strategy');
      return { found: false };
    }

    const startSpan = wordSpans[matchStartIndex];
    const endSpan = wordSpans[matchEndIndex];
    if (!startSpan || !endSpan) {
      return { found: false };
    }

    const range = doc.createRange();
    range.setStart(startSpan.node, Math.min(startSpan.startOffset, startSpan.node.length));
    range.setEnd(endSpan.node, Math.min(endSpan.endOffset, endSpan.node.length));

    // Expand collapsed parents and scroll into view
    const parentElem = startSpan.node.parentElement;
    if (parentElem) {
      expandAncestors(parentElem);
      try {
        parentElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // Fallback for jsdom/happy-dom
      }
    }

    // Modern CSS Highlight API support
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : null);
    const cssObj = (win as unknown as { CSS?: { highlights?: { set: (name: string, h: unknown) => void; delete: (name: string) => void } } })?.CSS;
    const HighlightConstructor = (win as unknown as { Highlight?: new (...ranges: Range[]) => unknown })?.Highlight;

    if (cssObj?.highlights && HighlightConstructor) {
      try {
        const highlight = new HighlightConstructor(range);
        cssObj.highlights.set('unstuck-grounding-highlight', highlight);
        setTimeout(() => {
          cssObj.highlights?.delete('unstuck-grounding-highlight');
        }, 6000);
      } catch {
        // Fallback below
      }
    }

    // Visual fallback class on parent element
    if (parentElem) {
      parentElem.classList.add('unstuck-page-highlight');
      setTimeout(() => {
        parentElem.classList.remove('unstuck-page-highlight');
      }, 3500);
    }

    return {
      found: true,
      matchedLength: matchEndIndex - matchStartIndex + 1,
      strategyUsed,
    };
  } catch (err) {
    logger.debug('Highlighter error:', err);
    return { found: false };
  }
}

/**
 * Highlights text in the page, returning boolean for backwards compatibility.
 */
export function highlightTextInPage(
  searchText: string,
  doc: Document = document
): boolean {
  return highlightTextInPageDetailed(searchText, doc).found;
}
