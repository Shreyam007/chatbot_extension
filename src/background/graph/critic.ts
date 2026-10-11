import { GeminiClient } from '../llm';
import { createLogger } from '../../shared/logger';
import type { AgentGraphState, CriticEvaluation, GeneratedHintCandidate } from './types';

const logger = createLogger('Critic');

// Patterns that identify executable code or function signatures
const CODE_FENCE_REGEX = /```[\s\S]*?```/;
const FUNCTION_SIGNATURE_REGEX = /\b(def\s+\w+|function\s+\w+|public\s+(?:static\s+)?\w+\s+\w+|void\s+\w+|int\s+\w+\s*\(|vector\s*<|const\s+\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>)/i;
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
 * Normalizes text for robust substring matching
 */
export function normalizeTextForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["'“”‘’]/g, '')
    .trim();
}

/**
 * Grounding Check (b)
 * Verifies that candidate.groundedQuote is an exact or normalized substring of the statement text.
 */
export function checkGrounding(quote: string, statementText: string): boolean {
  if (!quote || quote.trim().length < 5) {
    return false;
  }

  const normalizedStatement = normalizeTextForMatching(statementText);
  const normalizedQuote = normalizeTextForMatching(quote);

  return normalizedStatement.includes(normalizedQuote);
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
  options?: { model?: string; tabId?: number; apiKey?: string; mockCriticPass?: boolean }
): Promise<CriticEvaluation> {
  const statementText = state.context.statementText || '';

  // 1. Deterministic Heuristic Leak Check
  const hasLeak = checkHeuristicLeak(candidate, state.level);

  // 2. Grounding Substring Check
  const isGrounded = checkGrounding(candidate.groundedQuote, statementText);

  // If deterministic checks already failed, reject immediately with clear reason
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
  }

  // Bypass LLM judge in mock test mode if requested
  if (options?.mockCriticPass) {
    return {
      pass: !hasLeak && isGrounded,
      leak: hasLeak,
      grounded: isGrounded,
      relevant: true,
      confidence: isGrounded ? 0.9 : 0.4,
      reason: isGrounded ? 'Deterministic checks passed.' : 'Quote not found in problem statement.',
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
