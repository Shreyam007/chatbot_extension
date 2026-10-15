import { describe, it, expect, vi } from 'vitest';
import { runAgentGraph } from '../../src/background/graph/graph';
import type { PageContext } from '../../src/shared/schemas/context';

const ARTICLE_CONTEXT: PageContext = {
  url: 'https://bharatdigital.org/fellowship#apply',
  title: 'Bharat Digital Fellowship',
  site: 'generic',
  contentType: 'article',
  statementText: 'The Bharat Digital Fellowship is a 12-month program with ₹75,000 monthly stipend.',
  tags: ['fellowship', 'digital'],
  isContest: false,
  detectedAt: Date.now(),
};

describe('Chat Honest Errors & No Fallback Scaffold Invariant', () => {
  it('returns honest error state when critic verification fails on chat query', async () => {
    // Mock candidate generation that returns a leaky code block that critic strictly rejects
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      hint: 'Here is the full solution code:\n```python\ndef launch(): return True\n```',
                      level: 1,
                      codeBlock: 'def launch(): return True',
                      selfConfidence: 0.95,
                    }),
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        }),
      } as unknown as Response;
    });

    const result = await runAgentGraph(ARTICLE_CONTEXT, 1, {
      model: 'gemini-2.5-flash',
      userQuery: 'explain me about rocket science on this page',
      apiKey: 'test-key',
      lowQuotaMode: true,
      isChatQuery: true,
      maxRetries: 1,
    });

    // Invariant 1: Result MUST NOT deliver the safe fallback problem scaffold
    expect(result.hint).toBeNull();

    // Invariant 2: Result must surface unverified draft and error information honestly
    expect(result.unverifiedDraft).toBeDefined();
    expect(result.unverifiedDraft).toContain('Here is the full solution code');
    expect(result.errorReason).toBeDefined();
    expect(result.trace.badgeStatus).toBe('unverified');
  });

  it('guarantees zero algorithmic problem scaffolds appear on non-problem pages even if retries exhausted', async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Malformed non-json response that causes parsing failure',
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        }),
      } as unknown as Response;
    });

    const result = await runAgentGraph(ARTICLE_CONTEXT, 1, {
      model: 'gemini-2.5-flash',
      userQuery: 'what is this fellowship about?',
      apiKey: 'test-key',
      lowQuotaMode: true,
      isChatQuery: true,
      maxRetries: 1,
    });

    if (result.hint?.text) {
      expect(result.hint.text).not.toContain('restating the problem in your own words');
      expect(result.hint.text).not.toContain('Identify what inputs are given');
    }
    // If generation failed, error state must be reported
    expect(result.errorCode).toBeDefined();
  });
});
