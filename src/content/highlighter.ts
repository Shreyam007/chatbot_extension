import { createLogger } from '../shared/logger';

const logger = createLogger('Highlighter');

/**
 * Normalizes text for resilient matching:
 * - Collapses consecutive whitespace
 * - Replaces non-breaking spaces (\u00a0) with regular spaces
 * - Normalizes smart quotes and apostrophes to standard ASCII
 */
export function normalizeHighlightText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f]/g, ' ')
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

interface CharMapEntry {
  node: Text;
  offset: number;
}

/**
 * Highlights a search query in the page, supporting queries that span
 * across multiple inline nodes (e.g. <strong>, <em>, <a>, <span>).
 * Uses CSS Custom Highlight API with Range fallback.
 */
export function highlightTextInPage(
  searchText: string,
  doc: Document = document
): boolean {
  if (!searchText || !doc.body) return false;
  const cleanSearch = normalizeHighlightText(searchText);
  if (cleanSearch.length < 3) return false;

  try {
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

    const charMap: CharMapEntry[] = [];
    let accumulatedText = '';
    let currentNode: Node | null;

    while ((currentNode = walker.nextNode())) {
      const textNode = currentNode as Text;
      const val = textNode.nodeValue || '';
      for (let i = 0; i < val.length; i++) {
        charMap.push({ node: textNode, offset: i });
        accumulatedText += val[i];
      }
      accumulatedText += ' ';
      charMap.push({ node: textNode, offset: val.length });
    }

    const normalizedDocText = normalizeHighlightText(accumulatedText);
    const matchIndex = normalizedDocText.indexOf(cleanSearch);

    if (matchIndex === -1) {
      logger.debug('Highlight text not found in document text stream');
      return false;
    }

    // Map normalized index back to approximate text node positions
    const startEntry = charMap[Math.min(matchIndex, charMap.length - 1)];
    const endEntry = charMap[Math.min(matchIndex + cleanSearch.length, charMap.length - 1)];

    if (!startEntry || !endEntry) {
      return false;
    }

    const range = doc.createRange();
    range.setStart(startEntry.node, Math.min(startEntry.offset, startEntry.node.length));
    range.setEnd(endEntry.node, Math.min(endEntry.offset, endEntry.node.length));

    // Scroll into view
    const parentElem = startEntry.node.parentElement;
    if (parentElem) {
      parentElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Modern CSS Highlight API support
    const cssObj = (window as unknown as { CSS?: { highlights?: { set: (name: string, h: unknown) => void; delete: (name: string) => void } } }).CSS;
    const HighlightConstructor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;

    if (cssObj?.highlights && HighlightConstructor) {
      try {
        const highlight = new HighlightConstructor(range);
        cssObj.highlights.set('unstuck-grounding-highlight', highlight);
        setTimeout(() => {
          cssObj.highlights?.delete('unstuck-grounding-highlight');
        }, 5000);
      } catch {
        // Fall back to DOM outline
      }
    }

    // Visual fallback outline on nearest parent element
    if (parentElem) {
      const origOutline = parentElem.style.outline;
      const origTransition = parentElem.style.transition;
      parentElem.style.transition = 'outline 0.3s ease-in-out';
      parentElem.style.outline = '3px solid #4be277';
      setTimeout(() => {
        parentElem.style.outline = origOutline;
        parentElem.style.transition = origTransition;
      }, 3500);
    }

    return true;
  } catch (err) {
    logger.debug('Multi-node highlight error:', err);
    return false;
  }
}
