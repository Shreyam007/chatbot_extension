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
