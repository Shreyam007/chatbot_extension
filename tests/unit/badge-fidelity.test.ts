import { describe, it, expect, vi } from 'vitest';
import { runAgentGraph } from '../../src/background/graph/graph';
import type { PageContext } from '../../src/shared/schemas/context';

const PAGE_CONTEXT: PageContext = {
  url: 'https://example.com/doc',
  title: 'API Documentation',
  site: 'generic',
  contentType: 'documentation',
  statementText: 'The endpoint /api/v1/users returns a list of paginated user objects.',
  tags: [],
  isContest: false,
  detectedAt: Date.now(),
};

describe('Badge Fidelity: Low Quota Mode & Critic Statuses', () => {
  it('assigns checked_basic when lowQuotaMode is true and critic approved', async () => {
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
                      hint: 'The endpoint returns paginated user objects.',
                      level: 1,
                      groundedQuote: 'returns a list of paginated user objects',
                      codeBlock: null,
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

    const result = await runAgentGraph(PAGE_CONTEXT, 1, {
      model: 'gemini-2.5-flash',
      userQuery: 'what does this endpoint return?',
      apiKey: 'test-key',
      lowQuotaMode: true,
      isChatQuery: true,
    });

    expect(result.trace.badgeStatus).toBe('checked_basic');
  });

  it('assigns checked when standard mode (lowQuotaMode: false) and critic approved', async () => {
    global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      const promptText = body?.contents?.[0]?.parts?.[0]?.text || '';
      const isJudge = promptText.includes('pedagogy judge');
      const payload = isJudge
        ? {
            pass: true,
            leak: false,
            grounded: true,
            relevant: true,
            confidence: 0.95,
            reason: 'Critic verified',
          }
        : {
            hint: 'The endpoint returns paginated user objects.',
            level: 1,
            groundedQuote: 'returns a list of paginated user objects',
            codeBlock: null,
            selfConfidence: 0.95,
          };

      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(payload),
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        }),
      } as unknown as Response;
    });

    const result = await runAgentGraph(PAGE_CONTEXT, 1, {
      model: 'gemini-2.5-flash',
      userQuery: 'what does this endpoint return?',
      apiKey: 'test-key',
      lowQuotaMode: false,
      isChatQuery: true,
    });

    expect(result.trace.badgeStatus).toBe('checked');
  });

  it('assigns partly_verified when quote fails grounding in chat query', async () => {
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
                      hint: 'The endpoint returns paginated user objects.',
                      level: 1,
                      groundedQuote: 'invented quote that does not exist in context',
                      codeBlock: null,
                      selfConfidence: 0.90,
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

    const result = await runAgentGraph(PAGE_CONTEXT, 1, {
      model: 'gemini-2.5-flash',
      userQuery: 'what does this endpoint return?',
      apiKey: 'test-key',
      lowQuotaMode: true,
      isChatQuery: true,
    });

    expect(result.trace.badgeStatus).toBe('partly_verified');
    expect(result.hint?.confidence).toBe(0.60);
    expect(result.hint?.groundedQuote).toBeUndefined();
  });
});
