// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import { highlightTextInPageDetailed, highlightTextInPage } from '../../src/content/highlighter';

describe('Multi-Node Page Highlighter (Part C)', () => {
  it('highlights simple text within a single node', () => {
    const win = new Window({ url: 'https://example.com' });
    win.document.write(`
      <div id="content">
        <p>Binary search operates on sorted arrays in logarithmic time.</p>
      </div>
    `);
    const doc = win.document as unknown as Document;

    const result = highlightTextInPageDetailed('operates on sorted arrays', doc);
    expect(result.found).toBe(true);
    expect(result.strategyUsed).toBe('exact_sequence');
    expect(highlightTextInPage('operates on sorted arrays', doc)).toBe(true);
  });

  it('highlights text spanning across multiple inline nodes (strong, em, a)', () => {
    const win = new Window({ url: 'https://example.com' });
    win.document.write(`
      <div id="content">
        <p>An <strong>algorithm</strong> that runs in <em>O(log n)</em> time complexity.</p>
      </div>
    `);
    const doc = win.document as unknown as Document;

    const result = highlightTextInPageDetailed('algorithm that runs in O(log n)', doc);
    expect(result.found).toBe(true);
    expect(result.strategyUsed).toBe('exact_sequence');
  });

  it('handles Wikipedia citations and typographic dashes/quotes seamlessly', () => {
    const win = new Window({ url: 'https://en.wikipedia.org/wiki/India' });
    win.document.write(`
      <div id="content">
        <p>India is a country in South Asia[1][20]—spanning over three million square kilometres.</p>
      </div>
    `);
    const doc = win.document as unknown as Document;

    // Search query without citations and standard dashes
    const result = highlightTextInPageDetailed('India is a country in South Asia-spanning over three million', doc);
    expect(result.found).toBe(true);
  });

  it('expands collapsed <details> accordions when match is inside', () => {
    const win = new Window({ url: 'https://example.com' });
    win.document.write(`
      <div id="content">
        <details id="faq-details">
          <summary>FAQ Section</summary>
          <p>The solution requires dynamic programming with memoization.</p>
        </details>
      </div>
    `);
    const doc = win.document as unknown as Document;
    const details = doc.getElementById('faq-details') as HTMLDetailsElement;
    expect(details.open).toBe(false);

    const result = highlightTextInPageDetailed('dynamic programming with memoization', doc);
    expect(result.found).toBe(true);
    expect(details.open).toBe(true);
  });

  it('returns found: false when search text is absent', () => {
    const win = new Window({ url: 'https://example.com' });
    win.document.write('<div id="content"><p>Some regular page text.</p></div>');
    const doc = win.document as unknown as Document;

    const result = highlightTextInPageDetailed('completely absent text query', doc);
    expect(result.found).toBe(false);
    expect(highlightTextInPage('completely absent text query', doc)).toBe(false);
  });
});
