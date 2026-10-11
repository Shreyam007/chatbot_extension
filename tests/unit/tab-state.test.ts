import { describe, it, expect, beforeEach } from 'vitest';
import {
  setTabContext,
  getTabContext,
  clearTabSession,
} from '../../src/shared/storage/chrome-storage';
import type { PageContext } from '../../src/shared/schemas/context';

describe('Multi-Tab State Isolation (EC-007)', () => {
  const tab1 = 101;
  const tab2 = 102;

  const contextProblemA: PageContext = {
    url: 'https://leetcode.com/problems/two-sum',
    title: 'Two Sum',
    site: 'leetcode',
    statementText: 'Given an array of integers nums...',
    tags: ['Arrays & Hashing'],
    isContest: false,
    detectedAt: 1728640000000,
  };

  const contextProblemB: PageContext = {
    url: 'https://codeforces.com/problemset/problem/4/A',
    title: 'Watermelon',
    site: 'codeforces',
    statementText: 'One hot summer day Pete and his friend Billy...',
    tags: ['Math', 'Brute Force'],
    isContest: false,
    detectedAt: 1728640010000,
  };

  beforeEach(async () => {
    await clearTabSession(tab1);
    await clearTabSession(tab2);
  });

  it('keeps page contexts strictly isolated per tab ID without cross-talk', async () => {
    await setTabContext(tab1, contextProblemA);
    await setTabContext(tab2, contextProblemB);

    const retrieved1 = await getTabContext(tab1);
    const retrieved2 = await getTabContext(tab2);

    expect(retrieved1?.title).toBe('Two Sum');
    expect(retrieved1?.site).toBe('leetcode');

    expect(retrieved2?.title).toBe('Watermelon');
    expect(retrieved2?.site).toBe('codeforces');
  });

  it('clearing one tab session leaves other open tabs completely untouched', async () => {
    await setTabContext(tab1, contextProblemA);
    await setTabContext(tab2, contextProblemB);

    await clearTabSession(tab1);

    const retrieved1 = await getTabContext(tab1);
    const retrieved2 = await getTabContext(tab2);

    expect(retrieved1).toBeNull();
    expect(retrieved2).not.toBeNull();
    expect(retrieved2?.title).toBe('Watermelon');
  });
});
