/**
 * Intent detection for user queries.
 * Detects whether a query is asking for a broad summary, overview, or comprehensive explanation
 * of the entire page/article rather than a specific targeted question.
 */

// English patterns matching broad summary requests
const ENGLISH_SUMMARY_PATTERNS = [
  /\bexplain\s+(me\s+)?(about\s+)?(this\s+|the\s+)?(page|site|article|fellowship|program|document)\b/i,
  /\b(tell\s+me\s+)?(all\s+)?details\b/i,
  /\b(in\s+)?short\s+points\b/i,
  /\b(summarise|summarize|summary|overview|breakdown|break\s+down)\b/i,
  /\bwhat\s+is\s+this\s+(page|site|article|fellowship|program)\s+about\b/i,
  /\bkey\s+takeaways\b/i,
  /\bkey\s+points\b/i,
  /\btell\s+me\s+everything\b/i,
  /\bhigh[- ]level\s+overview\b/i,
  /\blist\s+all\b/i,
  /\bwhat\s+does\s+this\s+page\s+(say|cover)\b/i,
  /\b(structure|layout|outline)\b/i,
];

// Hinglish / vernacular patterns matching summary requests
const HINGLISH_SUMMARY_PATTERNS = [
  /\b(is|iss)\s+page\s+(ke|pe|me|par|ka)\b/i,
  /\bsab\s+(kuch\s+)?batao\b/i,
  /\b(kya\s+hai|kya\s+likha\s+hai)\b/i,
  /\bdetails\s+batao\b/i,
  /\bpoints\s+me(n)?\s+samjhao\b/i,
  /\b(is|iss)\s+fellowship\s+(ke|ka)\s+baare\s+me(n)?\b/i,
  /\bsamjha\s+do\b/i,
];

/**
 * Checks if a user's query indicates a broad summary or overview intent.
 */
export function isBroadSummaryIntent(query: string): boolean {
  if (!query || query.trim().length === 0) {
    return false;
  }

  const normalized = query.trim().toLowerCase();

  // Check English patterns
  for (const pattern of ENGLISH_SUMMARY_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  // Check Hinglish patterns
  for (const pattern of HINGLISH_SUMMARY_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}
