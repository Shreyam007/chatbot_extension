// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Window } from 'happy-dom';
import { wikipediaAdapter } from '../../src/content/adapters/wikipedia';
import { truncateToBudget } from '../../src/shared/budget';
import { getPageProfile } from '../../src/shared/page-profile';
import { generateSafeFallback } from '../../src/background/graph/fallback';
import { calculateMetricsFromRecords, isNonCodingKey } from '../../src/shared/metrics/calculator';
import type { AgentGraphState } from '../../src/background/graph/types';
import type { EventLogEntry } from '../../src/shared/schemas/events';
import type { StoredHint } from '../../src/shared/storage/db';

describe('Regression Tests: Large Page Budget & Non-Coding Page Handling (v1.0.10)', () => {
  const largeFixturePath = path.resolve(__dirname, '../fixtures/large/wikipedia-india.html');

  it('1. Very large Wikipedia article extracts non-empty text within budget', () => {
    expect(fs.existsSync(largeFixturePath)).toBe(true);
    const rawHtml = fs.readFileSync(largeFixturePath, 'utf-8');
    expect(rawHtml.length).toBeGreaterThan(1_000_000);

    const win = new Window({ url: 'https://en.wikipedia.org/wiki/India' });
    win.document.write(rawHtml);
    const doc = win.document as unknown as Document;

    const extracted = wikipediaAdapter.extractContext(doc, new URL('https://en.wikipedia.org/wiki/India'));
    expect(extracted).not.toBeNull();
    if (!extracted) return;

    // Statement text is non-empty and bounded by 16,000 chars
    expect(extracted.statementText.length).toBeGreaterThan(500);
    expect(extracted.statementText.length).toBeLessThanOrEqual(16000);
    expect(extracted.statementText).toContain('India');

    // Sections are extracted and bounded by cumulative budget
    expect(extracted.sections).toBeDefined();
    expect(extracted.sections!.length).toBeGreaterThan(5);
    const totalChars = extracted.sections!.reduce((sum, s) => sum + s.text.length, 0);
    expect(totalChars).toBeLessThanOrEqual(60000);

    // Profile and taxonomy
    expect(extracted.contentType).toBe('article');
    const profile = getPageProfile(extracted, 'https://en.wikipedia.org/wiki/India');
    expect(profile.kind).toBe('article');
    expect(profile.sourceName).toBe('Wikipedia');
    expect(profile.contextLabel).toBe('Wikipedia - Article');
  });

  it('2. Property test: for any non-empty input length, output length is between 1 and budget', () => {
    const testLengths = [1, 5, 20, 50, 100, 500, 1000, 5000, 16000, 25000, 100000];
    const budget = 16000;

    for (const len of testLengths) {
      const input = 'A'.repeat(len);
      const truncated = truncateToBudget(input, budget);
      expect(truncated.length).toBeGreaterThanOrEqual(1);
      expect(truncated.length).toBeLessThanOrEqual(budget);
    }
  });

  it('3. isNonCodingKey filters non-coding hashes and prevents Progress metrics contamination', () => {
    expect(isNonCodingKey('en.wikipedia.org:-wiki-india')).toBe(true);
    expect(isNonCodingKey('wikipedia:india')).toBe(true);
    expect(isNonCodingKey('about:blank#standalone')).toBe(true);
    expect(isNonCodingKey('page:active')).toBe(true);
    expect(isNonCodingKey('developer.mozilla.org:-en-us-docs-web')).toBe(true);

    // Coding keys should return false
    expect(isNonCodingKey('leetcode:two-sum')).toBe(false);
    expect(isNonCodingKey('codeforces:1-a')).toBe(false);

    const mockEvents: EventLogEntry[] = [
      {
        id: 'e1',
        timestamp: 1000,
        type: 'problem_opened',
        contextHash: 'en.wikipedia.org:-wiki-india',
        title: 'India - Wikipedia',
        details: {},
      },
      {
        id: 'e2',
        timestamp: 1100,
        type: 'hint_viewed',
        contextHash: 'en.wikipedia.org:-wiki-india',
        title: 'India - Wikipedia',
        details: { level: 1 },
      },
      {
        id: 'e3',
        timestamp: 1200,
        type: 'problem_opened',
        contextHash: 'leetcode:two-sum',
        title: 'Two Sum',
        details: {},
      },
      {
        id: 'e4',
        timestamp: 1300,
        type: 'problem_solved',
        contextHash: 'leetcode:two-sum',
        title: 'Two Sum',
        details: { timeTakenMs: 45000, hintsUsed: 1 },
      },
    ];

    const mockHints: StoredHint[] = [
      {
        id: 'h1',
        problemHash: 'en.wikipedia.org:-wiki-india',
        hint: { level: 1, text: 'Summary hint', confidence: 0.9, checks: { leak: false, grounded: true, relevant: true }, retries: 0, model: 'test', latencyMs: 10 },
        timestamp: 1100,
      },
      {
        id: 'h2',
        problemHash: 'leetcode:two-sum',
        hint: { level: 2, text: 'Two sum approach', confidence: 0.9, checks: { leak: false, grounded: true, relevant: true }, retries: 0, model: 'test', latencyMs: 10 },
        timestamp: 1250,
      },
    ];

    const metrics = calculateMetricsFromRecords(mockEvents, mockHints, {}, []);

    // Only leetcode:two-sum should be counted as an attempted problem
    expect(metrics.problemsAttempted).toBe(1);
    expect(metrics.recentProblemRecords.length).toBe(1);
    expect(metrics.recentProblemRecords[0]!.id).toBe('leetcode:two-sum');
    expect(metrics.solvedProblemsCount).toBe(1);
  });

  it('4. Safe fallback for articles contains educational reading tips, zero algorithmic wording', () => {
    const mockArticleState: AgentGraphState = {
      context: {
        url: 'https://en.wikipedia.org/wiki/India',
        title: 'India',
        site: 'generic',
        statementText: 'India is a country in South Asia...',
        contentType: 'article',
        tags: [],
        isContest: false,
        detectedAt: Date.now(),
      },
      level: 1,
      retryCount: 3,
      trace: {
        id: 'trace-1',
        problemHash: 'en.wikipedia.org:-wiki-india',
        requestedLevel: 1,
        startTime: Date.now(),
        totalDurationMs: 50,
        nodeTimings: [],
        criticEvaluations: [],
        model: 'gemini-2.5-flash',
        retries: 3,
        isFallback: true,
        badgeStatus: 'unverified',
      },
    };

    const fallbackL1 = generateSafeFallback(mockArticleState);
    expect(fallbackL1.text).not.toMatch(/algorithm|inputs are given|what invariants must hold|ordered, partitioned/i);
    expect(fallbackL1.text).toMatch(/introductory section|main headings|core concepts/i);

    mockArticleState.level = 2;
    const fallbackL2 = generateSafeFallback(mockArticleState);
    expect(fallbackL2.text).not.toMatch(/pencil and paper|state changes at each step/i);
    expect(fallbackL2.text).toMatch(/definitions|highlighted terms/i);
  });

  it('5. Critic rejects reading failure apologies and model lack of text responses', async () => {
    const { evaluateHint } = await import('../../src/background/graph/critic');
    const mockState: AgentGraphState = {
      context: {
        url: 'https://en.wikipedia.org/wiki/India',
        title: 'India',
        site: 'generic',
        statementText: '',
        contentType: 'article',
        tags: [],
        isContest: false,
        detectedAt: Date.now(),
      },
      level: 1,
      retryCount: 0,
      trace: {
        id: 'trace-2',
        problemHash: 'en.wikipedia.org:-wiki-india',
        requestedLevel: 1,
        startTime: Date.now(),
        totalDurationMs: 10,
        nodeTimings: [],
        criticEvaluations: [],
        model: 'gemini-2.5-flash',
        retries: 0,
        isFallback: false,
        badgeStatus: 'unverified',
      },
    };

    const failingCandidate = {
      hint: "I'm sorry, but there is no readable page text available to summarize.",
      topics: ['general'],
      selfConfidence: 0.9,
    };

    const evalResult = await evaluateHint(failingCandidate, mockState, { lowQuotaMode: true });
    expect(evalResult.pass).toBe(false);
    expect(evalResult.grounded).toBe(false);
    expect(evalResult.confidence).toBeLessThanOrEqual(0.3);
  });
});
