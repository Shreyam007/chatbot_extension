import type { ContentType } from '../../shared/schemas/context';

/**
 * Classifies a webpage into 'problem' | 'documentation' | 'article' | 'general'
 * based on URL patterns, meta tags, and DOM structure.
 */
export function classifyContentType(doc: Document, url: URL): ContentType {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  // 1. Coding Problem platforms & markers
  const knownProblemHosts = [
    'leetcode.com',
    'codeforces.com',
    'hackerrank.com',
    'atcoder.jp',
    'codechef.com',
    'spoj.com',
    'geeksforgeeks.org/problems',
    'cses.fi',
    'topcoder.com',
  ];

  if (knownProblemHosts.some((h) => hostname.includes(h) || (hostname + pathname).includes(h))) {
    return 'problem';
  }

  const problemDomMarkers = [
    '.problem-statement',
    '#problem-statement',
    'div[data-track-load="description_content"]',
    '.question-content',
    'div[data-cy="question-title"]',
  ];
  if (problemDomMarkers.some((sel) => doc.querySelector(sel))) {
    return 'problem';
  }

  // 2. Documentation sites & structures
  const docKeywords = ['docs.', 'developer.', 'api.', 'devdocs.io', 'readthedocs.io', 'learn.microsoft.com'];
  if (docKeywords.some((k) => hostname.includes(k))) {
    return 'documentation';
  }

  if (
    pathname.includes('/docs/') ||
    pathname.includes('/documentation/') ||
    pathname.includes('/reference/') ||
    pathname.includes('/api/') ||
    pathname.includes('/manual/') ||
    pathname.includes('/guide/')
  ) {
    return 'documentation';
  }

  if (
    doc.querySelector('nav.toc, .api-reference, .doc-content, .docs-navigation, [role="doc-toc"]')
  ) {
    return 'documentation';
  }

  // 3. Articles & Encyclopedias (e.g., Wikipedia, Medium, Blogs, News)
  if (hostname.includes('wikipedia.org') && pathname.includes('/wiki/')) {
    return 'article';
  }

  if (
    doc.querySelector('article') ||
    doc.querySelector('.post-content') ||
    doc.querySelector('.entry-content') ||
    doc.querySelector('.article-body') ||
    doc.querySelector('[itemprop="articleBody"]') ||
    doc.querySelector('.mw-parser-output')
  ) {
    return 'article';
  }

  // If page contains an h1 and at least 3 paragraphs of text, treat as article
  const paragraphs = doc.querySelectorAll('p');
  if (doc.querySelector('h1') && paragraphs.length >= 3) {
    let substantialPCount = 0;
    for (const p of Array.from(paragraphs)) {
      if ((p.textContent?.trim().length || 0) > 80) {
        substantialPCount++;
      }
    }
    if (substantialPCount >= 2) {
      return 'article';
    }
  }

  return 'general';
}
