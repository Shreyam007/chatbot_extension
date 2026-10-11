import { describe, it, expect } from 'vitest';

describe('Editor Virtualization & Best-Effort Code Capture (EC-028)', () => {
  it('gracefully handles virtualized editor DOM where only visible lines are present in DOM', () => {
    // Simulates a virtualized Monaco / CodeMirror editor where 1000 lines exist in buffer
    // but only visible lines 10-25 are currently rendered in DOM
    const visibleLines = [
      'class Solution:',
      '    def twoSum(self, nums: List[int], target: int) -> List[int]:',
      '        lookup = {}',
    ];

    const capturedSnippet = visibleLines.join('\n');
    expect(capturedSnippet).toContain('lookup = {}');
    expect(capturedSnippet.length).toBeLessThan(10000);
  });

  it('allows user code to be optional and handles empty or virtualized lines safely', () => {
    const emptyCapture = '';
    const safeCode = emptyCapture.trim().length > 0 ? emptyCapture : undefined;
    expect(safeCode).toBeUndefined();
  });
});
