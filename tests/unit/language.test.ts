import { describe, it, expect } from 'vitest';
import { buildContext } from '../../src/background/graph/context-builder';
import type { PageContext } from '../../src/shared/schemas/context';
import type { AgentGraphState } from '../../src/background/graph/types';

describe('Multilingual & Hinglish Linguistic Robustness (EC-026 & EC-126)', () => {
  it('safely encapsulates non-English problem statements inside untrusted data boundaries (EC-026)', () => {
    const foreignContext: PageContext = {
      url: 'https://leetcode.com/problems/two-sum-es',
      title: 'Dos Sumas',
      site: 'leetcode',
      statementText: 'Dado un arreglo de números enteros nums y un entero target, devuelve los índices...',
      tags: ['Arreglos'],
      isContest: false,
      detectedAt: Date.now(),
    };

    const state: AgentGraphState = {
      context: foreignContext,
      level: 1,
      retryCount: 0,
      trace: {
        id: 'trace-lang-1',
        problemHash: 'two-sum-es',
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

    expect(prompt).toContain('<<<UNTRUSTED_PAGE_DATA>>>');
    expect(prompt).toContain('Dado un arreglo de números enteros');
    expect(prompt).toContain('<<<END_UNTRUSTED_PAGE_DATA>>>');
    expect(prompt).toContain('UNTRUSTED DATA');
  });

  it('preserves user Hinglish and colloquial phrasing in prompt context without corruption (EC-126)', () => {
    const context: PageContext = {
      url: 'https://leetcode.com/problems/two-sum',
      title: 'Two Sum',
      site: 'leetcode',
      statementText: 'Given an array of integers nums and an integer target...',
      tags: ['Arrays & Hashing'],
      isContest: false,
      detectedAt: Date.now(),
    };

    const hinglishQuery = 'Bhai mujhe time complexity samajh nahi aa rahi, brute force O(N^2) kaise reduce karein?';

    const state: AgentGraphState = {
      context,
      level: 1,
      userQuery: hinglishQuery,
      retryCount: 0,
      trace: {
        id: 'trace-lang-2',
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

    expect(prompt).toContain(hinglishQuery);
    expect(prompt).toContain('Student Question:');
  });
});
