/**
 * Unified Text Normalization for Extractor, Grounding Checks, and Highlighter
 * (Part C of v1.0.8 "PAGE-AWARE")
 */

/**
 * Normalizes text for resilient matching across DOM text nodes and extracted content.
 * Handles:
 * - Wikipedia citation markers ([1], [20], [citation needed], [edit])
 * - Non-breaking spaces (\u00a0) and typographic whitespace
 * - Smart/curly quotes and apostrophes to standard ASCII
 * - Em/en dashes and typographic hyphens
 * - Zero-width spaces, soft hyphens, and BOM characters
 * - Whitespace collapsing and optional lowercase
 */
export function normaliseForMatch(
  text: string,
  options: { lowercase?: boolean; stripCitations?: boolean } = {}
): string {
  if (!text) return '';
  const { lowercase = true, stripCitations = true } = options;

  let result = text;

  // 1. Strip Wikipedia / Academic citation markers like [1], [20], [citation needed], [edit]
  if (stripCitations) {
    result = result
      .replace(/\[(?:citation needed|\d+|[a-zA-Z0-9_-]{1,15}|edit)\]/gi, '')
      .replace(/\[\s*\d+\s*\]/g, '');
  }

  // 2. Remove zero-width spaces, soft hyphens, and byte order marks
  result = result.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

  // 3. Normalize non-breaking and typographic spaces to regular space
  result = result.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // 4. Normalize quotes and apostrophes to standard ASCII
  result = result
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');

  // 5. Normalize dashes and hyphens to ASCII hyphen
  result = result.replace(/[\u2010-\u2015\u2212]/g, '-');

  // 6. Collapse multiple consecutive spaces and newlines
  result = result.replace(/\s+/g, ' ').trim();

  // 7. Case folding if requested
  if (lowercase) {
    result = result.toLowerCase();
  }

  return result;
}

/**
 * Tokenizes text after normalization for token overlap checks.
 */
export function tokenizeForMatch(text: string): string[] {
  const norm = normaliseForMatch(text, { lowercase: true, stripCitations: true });
  return norm.split(/\s+/).filter((t) => t.length > 0);
}
