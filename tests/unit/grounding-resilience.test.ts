import { describe, it, expect } from 'vitest';
import {
  normalizeTextForGrounding,
  verifyQuoteGrounding,
  evaluateHint,
} from '../../src/background/graph/critic';
import type { AgentGraphState } from '../../src/background/graph/types';
import type { PageContext } from '../../src/shared/schemas/context';

describe('Grounding Check Resilience & Normalization', () => {
  it('strips markdown bullets, numbering, and unicode bullets correctly', () => {
    const raw = '• Duration: 12 months\n- Stipend: ₹75,000\n* Location: Hybrid\n1. First track';
    const normalized = normalizeTextForGrounding(raw);
    expect(normalized).toBe('duration 12 months stipend 75000 location hybrid first track');
  });

  it('normalizes curly quotes, backticks, and smart quotes to plain characters', () => {
    const raw = '“Apply for the ‘Bharat Digital’ Fellowship” `online`';
    const normalized = normalizeTextForGrounding(raw);
    expect(normalized).toBe('apply for the bharat digital fellowship online');
  });

  it('normalizes non-breaking spaces and unicode ellipses', () => {
    const raw = 'Competitive\u00a0monthly stipend… and health insurance';
    const normalized = normalizeTextForGrounding(raw);
    expect(normalized).toBe('competitive monthly stipend and health insurance');
  });

  it('grounds quote against sentPageText when quote came from retrieved section', () => {
    const quote = 'Selected fellows will receive hands-on mentorship from senior leaders.';
    const sentPageText = 'Section 3: Mentorship\n- Selected fellows will receive hands-on mentorship from senior leaders.\n- Bi-weekly check-ins.';
    const statementText = 'Overview: Bharat Digital Fellowship 2026.'; // Quote is NOT in statementText

    const result = verifyQuoteGrounding(quote, {
      sentPageText,
      statementText,
    });

    expect(result.isGrounded).toBe(true);
    expect(result.isFuzzy).toBe(false);
  });

  it('fuzzy matches when quote has minor token variances >= 0.85', () => {
    // Model returns quote with one minor word dropped or paraphrased
    const quote = 'Selected fellows receive hands-on mentorship from leaders across India.';
    const statementText = 'Selected fellows will receive hands-on mentorship from senior leaders across India.';

    const result = verifyQuoteGrounding(quote, {
      statementText,
    });

    expect(result.isGrounded).toBe(true);
    expect(result.isFuzzy).toBe(true);
  });

  it('partly verifies candidate in chat when quote fails grounding, dropping quote with confidence 0.60', async () => {
    const context: PageContext = {
      url: 'https://example.com/info',
      title: 'Information Page',
      site: 'generic',
      contentType: 'article',
      statementText: 'The project started in 2024 to support digital public infrastructure.',
      tags: [],
      isContest: false,
      detectedAt: Date.now(),
    };

    const candidate = {
      hint: 'The project focuses on digital public infrastructure development.',
      topics: ['DPI'],
      groundedQuote: 'Unverified quote that cannot be found anywhere in the page text.',
      selfConfidence: 0.90,
    };

    const state: AgentGraphState = {
      context,
      level: 1,
      retryCount: 0,
      userQuery: 'what does this project do?',
      isChatQuery: true,
      sentPageText: context.statementText,
      candidateHint: candidate,
      trace: {
        id: 'trace-resilience',
        problemHash: 'hash',
        requestedLevel: 1,
        retries: 0,
        isFallback: false,
        totalDurationMs: 0,
        nodeTimings: [],
        startTime: Date.now(),
        criticEvaluations: [],
        model: 'gemini-2.5-flash',
      },
    };

    const evalResult = await evaluateHint(candidate, state, { lowQuotaMode: true });

    // In chat queries, instead of harsh rejection causing safe fallback,
    // evaluateHint partly verifies it:
    expect(evalResult.pass).toBe(true);
    expect(evalResult.partlyVerified).toBe(true);
    // The ungrounded quote is dropped
    expect(candidate.groundedQuote).toBeUndefined();
  });
});
