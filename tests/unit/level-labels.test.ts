import { describe, it, expect } from 'vitest';
import type { HintLevel } from '../../src/shared/schemas/hints';

describe('Level Labels and Input Placeholder Content-Awareness', () => {
  const getLevelLabels = (isGeneric: boolean): Record<HintLevel, string> => {
    return isGeneric
      ? {
          1: 'Auto (Pointer)',
          2: 'Explain simply',
          3: 'Worked example',
          4: 'Full explanation',
        }
      : {
          1: 'Auto (L1 Direction)',
          2: 'L2 Approach',
          3: 'L3 Pseudocode',
          4: 'L4 Full Solution',
        };
  };

  const getInputPlaceholder = (isGeneric: boolean): string => {
    return isGeneric
      ? 'Ask a question about this page...'
      : 'Ask a question about this problem...';
  };

  it('renders non-problem pedagogical labels when contentType is article/generic', () => {
    const labels = getLevelLabels(true);
    expect(labels[1]).toBe('Auto (Pointer)');
    expect(labels[2]).toBe('Explain simply');
    expect(labels[3]).toBe('Worked example');
    expect(labels[4]).toBe('Full explanation');

    const placeholder = getInputPlaceholder(true);
    expect(placeholder).toBe('Ask a question about this page...');
  });

  it('renders algorithmic problem labels when contentType is problem or default', () => {
    const labels = getLevelLabels(false);
    expect(labels[1]).toBe('Auto (L1 Direction)');
    expect(labels[2]).toBe('L2 Approach');
    expect(labels[3]).toBe('L3 Pseudocode');
    expect(labels[4]).toBe('L4 Full Solution');

    const placeholder = getInputPlaceholder(false);
    expect(placeholder).toBe('Ask a question about this problem...');
  });
});
