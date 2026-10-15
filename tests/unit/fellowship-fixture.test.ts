// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { genericAdapter } from '../../src/content/adapters/generic';
import { runAgentGraph } from '../../src/background/graph/graph';
import { verifyQuoteGrounding } from '../../src/background/graph/critic';
import { isBroadSummaryIntent } from '../../src/shared/retrieval/intent';
import { buildCoverageContext } from '../../src/shared/retrieval/coverage';

describe('Fellowship Marketing Page Fixture Verification', () => {
  it('extracts accordion and collapsed FAQ content properly', () => {
    const fixtureHtml = fs.readFileSync(
      path.resolve(__dirname, '../fixtures/fellowship-marketing.html'),
      'utf-8'
    );
    document.documentElement.innerHTML = fixtureHtml;

    const url = new URL('https://bharatdigital.org/fellowship#apply');
    const context = genericAdapter.extractContext(document, url);
    expect(context).not.toBeNull();
    if (!context) return;

    // Check that details/summary FAQ content was extracted
    expect(context.statementText).toContain('computer science, design, economics');
    // Check that custom display:none accordion FAQ content was extracted
    expect(context.statementText).toContain('No prior government experience is necessary');
    expect(context.sections?.length).toBeGreaterThanOrEqual(5);
  });

  it('detects broad summary intent and builds full coverage context', () => {
    const fixtureHtml = fs.readFileSync(
      path.resolve(__dirname, '../fixtures/fellowship-marketing.html'),
      'utf-8'
    );
    document.documentElement.innerHTML = fixtureHtml;

    const url = new URL('https://bharatdigital.org/fellowship#apply');
    const context = genericAdapter.extractContext(document, url);
    expect(context).not.toBeNull();
    if (!context) return;

    const query2 = 'explain me about this fellowship all details on this page in short points';
    expect(isBroadSummaryIntent(query2)).toBe(true);

    const coverage = buildCoverageContext(context.sections || [], 6000);
    expect(coverage.coveredCount).toBe(context.sections?.length);
    expect(coverage.totalCount).toBe(context.sections?.length);
    expect(coverage.formattedContent).toContain('Track 1');
    expect(coverage.formattedContent).toContain('Fellowship Benefits');
    expect(coverage.formattedContent).toContain('Who is eligible to apply');
  });

  it('verifies quote grounding against sent coverage text even with bullet differences', () => {
    const quote = 'Competitive monthly stipend of ₹75,000 for all selected fellows.';
    const sentText = 'Benefits & Stipend\n- Competitive monthly stipend of ₹75,000 for all selected fellows.\n- Health insurance coverage.';

    const check = verifyQuoteGrounding(quote, {
      sentPageText: sentText,
      sections: [{ text: sentText }],
    });
    expect(check.isGrounded).toBe(true);
  });

  it('runs chat query end-to-end on fellowship page without safe fallback scaffold', async () => {
    const fixtureHtml = fs.readFileSync(
      path.resolve(__dirname, '../fixtures/fellowship-marketing.html'),
      'utf-8'
    );
    document.documentElement.innerHTML = fixtureHtml;

    const url = new URL('https://bharatdigital.org/fellowship#apply');
    const context = genericAdapter.extractContext(document, url);
    if (!context) throw new Error('Context extraction failed');

    const query2 = 'explain me about this fellowship all details on this page in short points';

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
                      hint: 'Here are the key fellowship details:\n• Duration: 12 months starting January 15, 2027\n• Monthly stipend: ₹75,000 (tax-exempt)\n• Tracks: Public Health, Open Financial Networks, Agritech, Clean Energy\n• Location: Hybrid with postings in New Delhi, Bengaluru, Hyderabad.',
                      level: 1,
                      groundedQuote: 'Competitive monthly stipend of ₹75,000 for all selected fellows.',
                      codeBlock: null,
                      selfConfidence: 0.95,
                      answerable_from_page: true,
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

    const graphResult = await runAgentGraph(context, 1, {
      model: 'gemini-2.5-flash',
      userQuery: query2,
      apiKey: 'test-key',
      lowQuotaMode: true,
      isChatQuery: true,
    });

    expect(graphResult.trace.isFallback).toBe(false);
    expect(graphResult.trace.retrievalMode).toBe('coverage');
    expect(graphResult.hint).not.toBeNull();
    // Invariant: NEVER contain generic algorithmic problem scaffold sentences
    expect(graphResult.hint!.text).not.toContain('restating the problem in your own words');
    expect(graphResult.hint!.text).not.toContain('Identify what inputs are given');
    expect(graphResult.hint!.text).toContain('fellowship');
    expect(graphResult.trace.badgeStatus).toBe('checked_basic');
  });
});
