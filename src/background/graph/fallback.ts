import type { Hint } from '../../shared/schemas/hints';
import type { AgentGraphState } from './types';

/**
 * Node: safe_fallback
 * Generates a generic, safe pedagogical scaffold when generation repeatedly fails
 * or critic rejection exceeds the retry threshold (retries > 2).
 * Confidence is clamped <= 0.35, triggering the S14.4 "I'm not sure" banner.
 */
export function generateSafeFallback(state: AgentGraphState): Hint {
  const level = state.level;
  let text = '';

  const prefix = 'Generic starter tips (not based on this page):\n';
  const isArticleOrGeneral = state.context.contentType && state.context.contentType !== 'problem';

  if (isArticleOrGeneral) {
    switch (level) {
      case 1:
        text =
          prefix +
          'Review the introductory section and main headings to identify core concepts. ' +
          'Formulate your inquiry around a specific topic or section heading from the text.';
        break;
      case 2:
        text =
          prefix +
          'Scan for definitions and key highlighted terms in the relevant section. ' +
          'Consider selecting a specific paragraph and asking about it directly.';
        break;
      case 3:
        text =
          prefix +
          'Look for summarized takeaways, tables, or chronological timelines in the text. ' +
          'Try pasting a short excerpt if you need a deeper contextual explanation.';
        break;
      case 4:
      default:
        text =
          prefix +
          'Synthesize the main points from the major sections of this document. ' +
          'Cross-reference specific terms against the lead summary for a complete overview.';
        break;
    }
  } else {
    switch (level) {
      case 1:
        text =
          prefix +
          'Start by restating the problem in your own words. ' +
          'Identify what inputs are given, what output is expected, and what invariants must hold. ' +
          'Consider whether the data can be ordered, partitioned, or indexed in advance.';
        break;
      case 2:
        text =
          prefix +
          'Consider solving a simplified version of the problem first. ' +
          'Trace a small example with pencil and paper. ' +
          'Think about what state changes at each step, and whether any past computations can be stored to avoid redundant work.';
        break;
      case 3:
        text =
          prefix +
          'Structure your logic into three phases:\n' +
          '1. Initialize your state containers and pointers.\n' +
          '2. Process elements in a loop while maintaining your invariant.\n' +
          '3. Handle edge cases (empty input, single element, negative numbers) before returning.';
        break;
      case 4:
        text =
          prefix +
          'A standard approach for this class of problem combines input preprocessing with efficient lookup. ' +
          'Check edge cases (such as zero or negative values), verify array boundaries, and ensure your time complexity is optimal for the given constraints.';
        break;
    }
  }

  return {
    level,
    text,
    confidence: 0.30, // Clamped low confidence (triggers S14.4 "I'm not sure" banner)
    checks: {
      leak: false,
      grounded: false,
      relevant: true,
    },
    retries: state.retryCount,
    model: 'safe_fallback_scaffold',
    latencyMs: 0,
  };
}
