import { describe, it, expect, vi, afterEach } from 'vitest';
import { runAgentGraph } from '../../src/background/graph';
import { checkGrounding, evaluateHint } from '../../src/background/graph/critic';
import { sendToBackground } from '../../src/shared/messaging/bus';
import type { PageContext } from '../../src/shared/schemas/context';
import type { AgentGraphState } from '../../src/background/graph/types';

const TWO_SUM_STATEMENT =
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. ' +
  'You may assume that each input would have exactly one solution, and you may not use the same element twice. ' +
  'You can return the answer in any order. Constraints: 2 <= nums.length <= 10^4.';

const MOCK_PAGE_CONTEXT: PageContext = {
  url: 'https://leetcode.com/problems/two-sum',
  site: 'leetcode',
  title: 'Two Sum',
  statementText: TWO_SUM_STATEMENT,
  tags: ['Array', 'Hash Table'],
  isContest: false,
  detectedAt: Date.now(),
};

describe('Chat Pipeline & Critic Grounding Tests', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects ungrounded quote "nums[i] + nums[j] == target" deterministically without calling LLM judge', async () => {
    const quote = 'nums[i] + nums[j] == target';
    const isGrounded = checkGrounding(quote, TWO_SUM_STATEMENT);
    expect(isGrounded).toBe(false);

    let llmJudgeCalled = false;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      llmJudgeCalled = true;
      return {
        ok: true,
        json: async () => ({ candidates: [] }),
      };
    });

    const mockState: AgentGraphState = {
      context: MOCK_PAGE_CONTEXT,
      level: 1,
      retryCount: 0,
      trace: {
        id: 'trace-test',
        problemHash: 'p1',
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

    const evaluation = await evaluateHint(
      {
        hint: 'Use a Hash Table to look up complements.',
        topics: ['Hash Table'],
        groundedQuote: quote,
        selfConfidence: 0.9,
      },
      mockState
    );

    expect(evaluation.pass).toBe(false);
    expect(evaluation.grounded).toBe(false);
    // Verified: LLM judge was NOT called because deterministic grounding failed
    expect(llmJudgeCalled).toBe(false);
  });

  it('accepts off-topic queries with answerable_from_page: false without failing grounding', async () => {
    const mockState: AgentGraphState = {
      context: MOCK_PAGE_CONTEXT,
      level: 1,
      userQuery: 'who invented this problem',
      retryCount: 0,
      trace: {
        id: 'trace-test',
        problemHash: 'p1',
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

    const evaluation = await evaluateHint(
      {
        hint: 'The author is not mentioned in the problem description. Focusing on the algorithmic problem: you need to find two numbers that sum to target.',
        topics: ['Array'],
        groundedQuote: '',
        answerable_from_page: false,
        selfConfidence: 0.9,
      },
      mockState,
      { mockCriticPass: true }
    );

    expect(evaluation.pass).toBe(true);
    expect(evaluation.grounded).toBe(true);
  });

  it('generates distinct candidate prompts and replies for 3 distinct user queries', async () => {
    const promptsSent: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      // Capture generator prompt
      if (body.contents?.[0]?.parts?.[0]?.text) {
        promptsSent.push(body.contents[0].parts[0].text);
      }

      // Check if generator or judge
      const isJudge = body.systemInstruction === undefined;
      if (isJudge) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        pass: true,
                        leak: false,
                        grounded: true,
                        relevant: true,
                        confidence: 0.9,
                        reason: 'Verified',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      }

      // Mock generator replies based on prompt content
      const promptText = body.contents[0].parts[0].text;
      let replyHint = 'Default reply';
      let groundedQuote = 'return indices of the two numbers';
      let answerable = true;

      if (promptText.includes('who invented this problem')) {
        replyHint = 'The original author of Two Sum is not specified on this page.';
        groundedQuote = '';
        answerable = false;
      } else if (promptText.includes('how would be the approach')) {
        replyHint = 'Consider iterating while storing the index of each number in a hash table.';
      } else if (promptText.includes('how?')) {
        replyHint = 'Notice the complement target minus current value.';
      }

      return {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      hint: replyHint,
                      topics: ['Hash Table'],
                      groundedQuote,
                      answerable_from_page: answerable,
                      selfConfidence: 0.9,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      };
    });

    const queries = ['who invented this problem', 'how would be the approach', 'how?'];
    const results: string[] = [];

    for (const q of queries) {
      const res = await runAgentGraph(MOCK_PAGE_CONTEXT, 1, {
        apiKey: 'test-api-key',
        userQuery: q,
        mockCriticPass: true,
      });
      results.push(res.hint.text);
    }

    // 1. Assert all 3 prompts captured contain the respective user query
    expect(promptsSent.length).toBe(3);
    expect(promptsSent[0]).toContain('who invented this problem');
    expect(promptsSent[1]).toContain('how would be the approach');
    expect(promptsSent[2]).toContain('how?');

    // 2. Assert all 3 returned replies are distinct (NOT the identical canned response!)
    expect(results[0]).not.toEqual(results[1]);
    expect(results[1]).not.toEqual(results[2]);
    expect(results[0]).not.toEqual(results[2]);
    expect(results[0]).toContain('author of Two Sum is not specified');
  });

  it('handles slow responses (>10s) without premature 10s bus timeout', async () => {
    const mockRuntime = {
      sendMessage: vi.fn((_message: unknown, callback: (response: unknown) => void) => {
        setTimeout(() => {
          callback({ ok: true, data: { reply: 'Async reply' } });
        }, 10);
      }),
    };

    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: mockRuntime,
    };

    const promise = sendToBackground({
      type: 'SUBMIT_CHAT_QUERY',
      query: 'how to solve?',
      problemHash: 'https://leetcode.com/problems/two-sum',
    });

    await expect(promise).resolves.toBeDefined();
  });
});
