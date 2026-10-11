import { GeminiClient } from '../llm';
import type { HintLevel } from '../../shared/schemas/hints';
import type { AgentGraphState, GeneratedHintCandidate } from './types';

export const HINT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hint: {
      type: 'STRING',
      description: 'The tutoring hint text explaining the concept or next step.',
    },
    codeBlock: {
      type: 'STRING',
      description: 'Code or pseudocode snippet. ONLY allowed for Level 3 (pseudocode) or Level 4 (full code). Must be omitted for Level 1 and Level 2.',
    },
    topics: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Algorithmic topics relevant to this hint (e.g., Two Pointers, Dynamic Programming).',
    },
    groundedQuote: {
      type: 'STRING',
      description: 'An exact word-for-word quote from the problem statement that directly anchors this hint.',
    },
    selfConfidence: {
      type: 'NUMBER',
      description: 'Self-estimated confidence between 0.0 and 1.0 that this hint is accurate and level-appropriate.',
    },
  },
  required: ['hint', 'topics', 'groundedQuote', 'selfConfidence'],
};

export function getSystemInstructionForLevel(level: HintLevel): string {
  switch (level) {
    case 1:
      return (
        'You are Unstuck, a Socratic programming tutor providing a LEVEL 1 (DIRECTION) hint.\n' +
        '- Goal: Point the student toward the right mental model or invariant without giving away the algorithm.\n' +
        '- HARD CONSTRAINT: You must contain ZERO code, ZERO function definitions, ZERO code fences, and ZERO pseudocode.\n' +
        '- Suggest the general paradigm (e.g. hash map lookup, sorting, two pointers) in high-level prose.\n' +
        '- You MUST include an exact groundedQuote substring from the problem statement.'
      );
    case 2:
      return (
        'You are Unstuck, a Socratic programming tutor providing a LEVEL 2 (APPROACH) hint.\n' +
        '- Goal: Describe the algorithmic outline and step-by-step reasoning in plain language.\n' +
        '- HARD CONSTRAINT: You must contain ZERO code blocks or executable syntax. Explain the data flow conceptually.\n' +
        '- You MUST include an exact groundedQuote substring from the problem statement.'
      );
    case 3:
      return (
        'You are Unstuck, a programming tutor providing a LEVEL 3 (PSEUDOCODE) hint.\n' +
        '- Goal: Provide structured pseudocode outlining key loops, variables, and state updates.\n' +
        '- You may include a codeBlock containing clear pseudocode.\n' +
        '- You MUST include an exact groundedQuote substring from the problem statement.'
      );
    case 4:
      return (
        'You are Unstuck, an expert coding tutor providing a LEVEL 4 (FULL SOLUTION) explanation.\n' +
        '- Goal: Deliver a complete, optimal implementation with time and space complexity analysis.\n' +
        '- Include clean, commented code in codeBlock explaining why each component works.\n' +
        '- You MUST include an exact groundedQuote substring from the problem statement.'
      );
  }
}

/**
 * Node: hint_generator
 * Calls the Gemini client with level-specific instructions and structured JSON schema.
 */
export async function generateHint(
  state: AgentGraphState,
  options?: { model?: string; tabId?: number; apiKey?: string }
): Promise<GeneratedHintCandidate> {
  const client = new GeminiClient(options?.apiKey);
  const systemInstruction = getSystemInstructionForLevel(state.level);
  const prompt = state.assembledPrompt || '';

  const response = await client.generateJson<GeneratedHintCandidate>(prompt, {
    model: options?.model,
    tabId: options?.tabId,
    temperature: 0.2,
    systemInstruction,
    responseSchema: HINT_SCHEMA,
  });

  const candidate = response.data;

  // Sanitize candidate fields
  return {
    hint: typeof candidate.hint === 'string' ? candidate.hint.trim() : '',
    codeBlock: typeof candidate.codeBlock === 'string' && candidate.codeBlock.trim() ? candidate.codeBlock.trim() : undefined,
    topics: Array.isArray(candidate.topics) ? candidate.topics.map(String) : [],
    groundedQuote: typeof candidate.groundedQuote === 'string' ? candidate.groundedQuote.trim() : '',
    selfConfidence: typeof candidate.selfConfidence === 'number' ? Math.max(0, Math.min(1, candidate.selfConfidence)) : 0.85,
  };
}
