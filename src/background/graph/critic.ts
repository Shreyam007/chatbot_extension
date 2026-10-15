import { GeminiClient } from '../llm';
import { createLogger } from '../../shared/logger';
import type { AgentGraphState, CriticEvaluation, GeneratedHintCandidate } from './types';

const logger = createLogger('Critic');

// Patterns that identify executable code or function signatures
const CODE_FENCE_REGEX = /```[\s\S]*?```/;
const FUNCTION_SIGNATURE_REGEX = /\b(def\s+\w+\s*\(|function\s+\w+\s*\(|public\s+(?:static\s+)?(?:[\w<>\[\]]+\s+)+\w+\s*\(|void\s+\w+\s*\(|int\s+\w+\s*\(|vector\s*<|const\s+\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/i;
const SYNTAX_STATEMENT_REGEX = /(?:\b(return\s+[^;.\n]+;|for\s*\([^)]+\)\s*\{|(?:if|while)\s*\([^;{}]+\)\s*\{|import\s+[\w{}*,\s]+\s+from)|#include\s*<)/i;

/**
 * Deterministic Heuristic Leak Detector (a)
 * For L1 and L2 hints, strictly ensures zero executable code or signatures are present.
 */
export function checkHeuristicLeak(candidate: GeneratedHintCandidate, level: number): boolean {
  if (level >= 3) {
    // Level 3 (pseudocode) and Level 4 (full code) explicitly allow code blocks
    return false;
  }

  // L1 or L2 having a codeBlock field is an automatic leak
  if (candidate.codeBlock && candidate.codeBlock.trim().length > 0) {
    return true;
  }

  const text = candidate.hint || '';

  // Check for markdown code fences
  if (CODE_FENCE_REGEX.test(text)) {
    return true;
  }

  // Check for programming language function definitions
  if (FUNCTION_SIGNATURE_REGEX.test(text)) {
    return true;
  }

  // Check for explicit code syntax statements
  if (SYNTAX_STATEMENT_REGEX.test(text)) {
    return true;
  }

  return false;
}

/**
 * Normalizes text for resilient substring and token matching.
 * Handles markdown formatting, bullets, ellipses, non-breaking spaces, curly quotes, and dashes.
 */
export function normalizeTextForGrounding(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/(^|[\s\n])(\d+\.|[•\-\*\+])\s+/gm, ' ')
    .replace(/[:;,₹$€£]/g, '')
    .replace(/[*_]{1,3}/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/["'“”‘’«»`]/g, '')
    .replace(/[—–]/g, '-')
    .replace(/\.{3,}|…/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Legacy normalize alias for existing imports.
 */
export function normalizeTextForMatching(text: string): string {
  return normalizeTextForGrounding(text);
}

/**
 * Calculates token overlap between quote and target corpus.
 */
export function computeTokenOverlap(quote: string, targetText: string): number {
  const quoteTokens = quote.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (quoteTokens.length === 0) return 0;

  const targetTokens = new Set(targetText.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  let matchCount = 0;
  for (const token of quoteTokens) {
    if (targetTokens.has(token)) {
      matchCount++;
    }
  }

  return matchCount / quoteTokens.length;
}

export interface QuoteGroundingResult {
  isGrounded: boolean;
  isFuzzy: boolean;
  partlyVerified: boolean;
}

/**
 * Comprehensive Grounding Check:
 * Tests candidate quote against sent page text, raw statement, sections, and selection.
 */
export function verifyQuoteGrounding(
  quote: string,
  sources: {
    sentPageText?: string;
    statementText?: string;
    sections?: Array<{ text: string }>;
    selectedText?: string;
  }
): QuoteGroundingResult {
  if (!quote || quote.trim().length < 5) {
    return { isGrounded: false, isFuzzy: false, partlyVerified: false };
  }

  const normQuote = normalizeTextForGrounding(quote);
  if (normQuote.length < 4) {
    return { isGrounded: false, isFuzzy: false, partlyVerified: false };
  }

  // 1. Check against exact sent page text (what was in prompt)
  if (sources.sentPageText) {
    const normSent = normalizeTextForGrounding(sources.sentPageText);
    if (normSent.includes(normQuote)) {
      return { isGrounded: true, isFuzzy: false, partlyVerified: false };
    }
  }

  // 2. Check against statement text
  if (sources.statementText) {
    const normStatement = normalizeTextForGrounding(sources.statementText);
    if (normStatement.includes(normQuote)) {
      return { isGrounded: true, isFuzzy: false, partlyVerified: false };
    }
  }

  // 3. Check against selected text
  if (sources.selectedText) {
    const normSelected = normalizeTextForGrounding(sources.selectedText);
    if (normSelected.includes(normQuote)) {
      return { isGrounded: true, isFuzzy: false, partlyVerified: false };
    }
  }

  // 4. Check against individual sections
  if (sources.sections) {
    for (const sec of sources.sections) {
      const normSec = normalizeTextForGrounding(sec.text);
      if (normSec.includes(normQuote)) {
        return { isGrounded: true, isFuzzy: false, partlyVerified: false };
      }
    }
  }

  // 5. Cheap local fuzzy match (token overlap >= 0.85)
  // Strictly prohibit fuzzy matching for code fragments (containing brackets, operators, assignments)
  const isCodeLike = /[=+*\/<>{}\[\];]|\s+-\s+|--|->/.test(quote);
  if (!isCodeLike) {
    const fullCorpus = [
      sources.sentPageText,
      sources.statementText,
      sources.selectedText,
      ...(sources.sections?.map((s) => s.text) || []),
    ]
      .filter(Boolean)
      .join(' ');

    const quoteTokens = quote.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    if (quoteTokens.length >= 4) {
      const overlap = computeTokenOverlap(normQuote, fullCorpus);
      if (overlap >= 0.85) {
        return { isGrounded: true, isFuzzy: true, partlyVerified: false };
      }
    }
  }

  return { isGrounded: false, isFuzzy: false, partlyVerified: true };
}

/**
 * Grounding Check (b)
 * Verifies that candidate.groundedQuote is an exact or normalized substring of the statement text.
 */
export function checkGrounding(quote: string, statementText: string): boolean {
  return verifyQuoteGrounding(quote, { statementText }).isGrounded;
}

export const CRITIC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    pass: { type: 'BOOLEAN', description: 'Whether the hint passes all pedagogical and safety criteria.' },
    leak: { type: 'BOOLEAN', description: 'True if Level 1 or 2 contains code, pseudocode, or excessive solution details.' },
    grounded: { type: 'BOOLEAN', description: 'True if the hint is anchored in the problem statement without hallucinating rules.' },
    relevant: { type: 'BOOLEAN', description: 'True if the hint directly addresses the student problem.' },
    confidence: { type: 'NUMBER', description: 'Confidence score between 0.0 and 1.0.' },
    reason: { type: 'STRING', description: 'Specific explanation of why the hint passed or failed.' },
  },
  required: ['pass', 'leak', 'grounded', 'relevant', 'confidence', 'reason'],
};

/**
 * Node: critic
 * Evaluates a candidate hint using deterministic leak checking, substring grounding,
 * and an independent LLM judge call (with graceful failure fallback, EC-090).
 */
export async function evaluateHint(
  candidate: GeneratedHintCandidate,
  state: AgentGraphState,
  options?: {
    model?: string;
    tabId?: number;
    apiKey?: string;
    mockCriticPass?: boolean;
    requestId?: string;
    lowQuotaMode?: boolean;
  }
): Promise<CriticEvaluation> {
  // 1. Deterministic Heuristic Leak Check
  const hasLeak = checkHeuristicLeak(candidate, state.level);

  // 2. Resilient Grounding Check against sent context & page sections
  const grounding = verifyQuoteGrounding(candidate.groundedQuote || '', {
    sentPageText: state.sentPageText,
    statementText: state.context.statementText,
    sections: state.context.sections,
    selectedText: state.context.selectedText,
  });

  let isGrounded = grounding.isGrounded;
  let partlyVerified = false;

  if (state.userQuery && candidate.answerable_from_page === false) {
    // Off-topic or unanswerable query: if quote provided, verify; if empty, accepted as honest off-page reply
    if (candidate.groundedQuote && candidate.groundedQuote.trim().length >= 5) {
      isGrounded = grounding.isGrounded;
    } else {
      isGrounded = true;
    }
  } else if (!isGrounded && state.userQuery) {
    // Grounding repair for user chat: if quote is missing or imperfect, do NOT trigger costly regeneration!
    // Drop the quote, mark as partly verified, discount confidence, and approve the answer.
    logger.info('Quote failed grounding in chat; dropping quote and accepting as partly verified without regeneration');
    candidate.groundedQuote = undefined;
    isGrounded = true;
    partlyVerified = true;
  }

  // If deterministic checks already failed, reject immediately with clear reason (no wasted LLM judge call)
  if (hasLeak) {
    return {
      pass: false,
      leak: true,
      grounded: isGrounded,
      relevant: true,
      confidence: 0.1,
      reason: `Hint for Level ${state.level} leaked executable code or function signatures.`,
    };
  }

  if (!isGrounded) {
    logger.warn('Hint rejected by Grounding Check: groundedQuote not found in statement text');
    return {
      pass: false,
      leak: false,
      grounded: false,
      relevant: false,
      confidence: 0.1,
      reason: 'Quote not found in problem statement.',
    };
  }

  // In low quota mode (default ON for free tier), skip LLM judge to stay within 2 LLM calls per request (Task E.2)
  if (options?.lowQuotaMode) {
    logger.debug('Low quota mode active: skipping LLM judge call, relying on deterministic verification');
    return {
      pass: true,
      leak: false,
      grounded: true,
      relevant: true,
      confidence: partlyVerified ? 0.60 : 0.85,
      reason: partlyVerified
        ? 'Accepted as partly verified without quote (low quota mode).'
        : 'Passed deterministic safety & grounding checks (low quota mode).',
      partlyVerified,
      fuzzyMatch: grounding.isFuzzy,
    };
  }

  // Bypass LLM judge in mock test mode if requested
  if (options?.mockCriticPass) {
    return {
      pass: !hasLeak && isGrounded,
      leak: hasLeak,
      grounded: isGrounded,
      relevant: true,
      confidence: isGrounded ? (partlyVerified ? 0.60 : 0.9) : 0.4,
      reason: isGrounded ? 'Deterministic checks passed.' : 'Quote not found in problem statement.',
      partlyVerified,
      fuzzyMatch: grounding.isFuzzy,
    };
  }

  // 3. LLM Judge Call (c)
  try {
    const judgePrompt =
      `You are an impartial algorithmic pedagogy judge.\n\n` +
      `Problem Title: ${state.context.title}\n` +
      `Target Level: ${state.level} (1=Direction only, 2=Approach only, 3=Pseudocode, 4=Full solution)\n\n` +
      `Candidate Hint:\n"${candidate.hint}"\n` +
      (candidate.codeBlock ? `Code Block:\n\`\`\`\n${candidate.codeBlock}\n\`\`\`\n` : '') +
      `Grounded Quote: "${candidate.groundedQuote}"\n\n` +
      `Evaluate whether this hint matches the target level without premature spoilers. Return structured JSON.`;

    const client = new GeminiClient(options?.apiKey);
    const judgeResponse = await client.generateJson<{
      pass: boolean;
      leak: boolean;
      grounded: boolean;
      relevant: boolean;
      confidence: number;
      reason: string;
    }>(judgePrompt, {
      model: options?.model,
      tabId: options?.tabId,
      requestId: options?.requestId,
      temperature: 0.1,
      maxOutputTokens: 512,
      responseSchema: CRITIC_SCHEMA,
    });

    const judgeData = judgeResponse.data;
    const finalPass = !hasLeak && isGrounded && judgeData.pass && !judgeData.leak;

    // Clamped composite confidence score
    const compositeConfidence = Math.max(
      0,
      Math.min(
        1,
        0.35 * candidate.selfConfidence +
          0.45 * (judgeData.confidence || 0.8) +
          (isGrounded ? 0.2 : 0.0)
      )
    );

    return {
      pass: finalPass,
      leak: hasLeak || judgeData.leak,
      grounded: isGrounded && judgeData.grounded,
      relevant: judgeData.relevant,
      confidence: compositeConfidence,
      reason: finalPass
        ? 'Hint successfully verified by all pedagogical checks.'
        : judgeData.reason || (hasLeak ? 'Code leak detected.' : 'Ungrounded claim detected.'),
    };
  } catch (err) {
    // EC-090: Critic call itself failed -> fallback safely to deterministic check
    logger.warn('LLM Critic call failed; falling back to deterministic heuristic results (EC-090)', err);

    const fallbackPass = !hasLeak && isGrounded;
    return {
      pass: fallbackPass,
      leak: hasLeak,
      grounded: isGrounded,
      relevant: true,
      confidence: fallbackPass ? 0.55 : 0.2, // Penalized confidence due to unverified status
      reason: fallbackPass
        ? 'Passed deterministic checks (LLM judge unavailable).'
        : 'Failed deterministic heuristic checks.',
    };
  }
}
