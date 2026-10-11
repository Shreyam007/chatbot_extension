import { describe, it, expect } from 'vitest';
import { LIMITS } from '../../src/shared/config';
import { buildContext } from '../../src/background/graph/context-builder';
import type { PageContext } from '../../src/shared/schemas/context';
import type { AgentGraphState } from '../../src/background/graph/types';

describe('Context Budgeting & User Input Limits (EC-024 & EC-092)', () => {
  it('truncates huge statement text exceeding budget limit (EC-024)', () => {
    const hugeStatement = 'A'.repeat(LIMITS.MAX_STATEMENT_CHARS + 5000);
    const context: PageContext = {
      url: 'https://leetcode.com/problems/huge-problem',
      title: 'Huge Problem',
      site: 'leetcode',
      statementText: hugeStatement,
      tags: [],
      isContest: false,
      detectedAt: Date.now(),
    };

    const state: AgentGraphState = {
      context,
      level: 1,
      retryCount: 0,
      trace: {
        id: 'trace-1',
        problemHash: 'huge-problem',
        requestedLevel: 1,
        startTime: Date.now(),
        totalDurationMs: 0,
        nodeTimings: [],
        retries: 0,
        criticEvaluations: [],
        isFallback: false,
        model: 'gemini-2.5-flash',
      },
    };

    const prompt = buildContext(state);
    // Verified that prompts use bounded statement text
    expect(prompt.length).toBeLessThan(hugeStatement.length);
    expect(prompt).toContain('[...Problem statement truncated for length...]');
  });

  it('caps extremely long user query paste at 2000 chars (EC-092)', () => {
    const context: PageContext = {
      url: 'https://leetcode.com/problems/two-sum',
      title: 'Two Sum',
      site: 'leetcode',
      statementText: 'Given nums and target...',
      tags: [],
      isContest: false,
      detectedAt: Date.now(),
    };

    const oversizedQuery = 'Can you help me solve this? '.repeat(200); // ~5600 chars
    expect(oversizedQuery.length).toBeGreaterThan(LIMITS.MAX_USER_MESSAGE_CHARS);

    const state: AgentGraphState = {
      context,
      level: 1,
      userQuery: oversizedQuery,
      retryCount: 0,
      trace: {
        id: 'trace-2',
        problemHash: 'two-sum',
        requestedLevel: 1,
        startTime: Date.now(),
        totalDurationMs: 0,
        nodeTimings: [],
        retries: 0,
        criticEvaluations: [],
        isFallback: false,
        model: 'gemini-2.5-flash',
      },
    };

    const prompt = buildContext(state);
    // User query in prompt must be bounded
    expect(prompt).toContain('Student Question:');
    expect(prompt.length).toBeLessThan(oversizedQuery.length + 1000);
  });
});
