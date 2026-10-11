// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  ErrorBoundary,
  formatDiagnostics,
  sanitizeDiagnosticsText,
} from '../../src/ui/ErrorBoundary';
import { createSyntheticKey } from '../helpers/keys';

// Set React act environment flag
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ProblematicChild: React.FC<{ shouldThrow?: boolean; message?: string }> = ({
  shouldThrow = false,
  message = 'Intentional UI crash',
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="normal-child">Normal Child Content</div>;
};

describe('ErrorBoundary Component (Step 14 & EC-127)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    // Suppress expected console.error during ErrorBoundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders children normally when no exception is thrown', async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary componentName="TestView">
          <ProblematicChild shouldThrow={false} />
        </ErrorBoundary>
      );
    });

    expect(container.textContent).toContain('Normal Child Content');
    expect(container.querySelector('[data-testid="error-boundary-fallback"]')).toBeNull();
  });

  it('catches render exceptions, displays fallback UI with role=alert', async () => {
    await act(async () => {
      root.render(
        <ErrorBoundary componentName="SidePanelApp">
          <ProblematicChild shouldThrow={true} message="Failed to parse side panel state" />
        </ErrorBoundary>
      );
    });

    const fallback = container.querySelector('[data-testid="error-boundary-fallback"]');
    expect(fallback).not.toBeNull();
    expect(fallback?.getAttribute('role')).toBe('alert');
    expect(container.textContent).toContain('Something went wrong in SidePanelApp');
    expect(container.textContent).toContain('Failed to parse side panel state');
    expect(container.textContent).toContain('Try again');
    expect(container.textContent).toContain('Copy diagnostics');
  });

  it('re-renders children when "Try again" button is clicked after error resolution', async () => {
    let throwError = true;
    const DynamicChild = () => {
      if (throwError) throw new Error('Transient error');
      return <div>Recovered Content</div>;
    };

    await act(async () => {
      root.render(
        <ErrorBoundary componentName="RecoverableView">
          <DynamicChild />
        </ErrorBoundary>
      );
    });

    expect(container.textContent).toContain('Something went wrong in RecoverableView');

    // Simulate transient error resolved
    throwError = false;
    const retryBtn = container.querySelector('[data-testid="error-retry-btn"]') as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();

    await act(async () => {
      retryBtn.click();
    });

    expect(container.textContent).toContain('Recovered Content');
  });

  describe('Zero-Secret & Zero-Page-Content Leakage Guarantee (Rule 4 & Rule 3)', () => {
    const REAL_LOOKING_KEY = createSyntheticKey('A');
    const SENSITIVE_PAGE_TEXT = '<<<UNTRUSTED_PAGE_DATA>>>leetcode problem statement with proprietary testcases<<<END_UNTRUSTED_DATA>>>';
    const SENSITIVE_CODE = 'statementText="Given an array of integers nums and an integer target, return indices"';

    it('sanitizes API keys and scraped page text from displayed error banner', async () => {
      const contaminatedMessage = `Network fetch error for key ${REAL_LOOKING_KEY} with ${SENSITIVE_CODE}`;

      await act(async () => {
        root.render(
          <ErrorBoundary componentName="ContaminatedView">
            <ProblematicChild shouldThrow={true} message={contaminatedMessage} />
          </ErrorBoundary>
        );
      });

      const text = container.textContent || '';
      // Proves API key is never rendered
      expect(text).not.toContain(REAL_LOOKING_KEY);
      expect(text).toContain('[REDACTED_API_KEY]');

      // Proves problem statement is never rendered
      expect(text).not.toContain('Given an array of integers nums');
      expect(text).toContain('[REDACTED_PAGE_DATA]');
    });

    it('sanitizes API keys and untrusted page text from formatDiagnostics payload', () => {
      const testError = new Error(
        `Failed LLM generation using key ${REAL_LOOKING_KEY} on page context: ${SENSITIVE_PAGE_TEXT}`
      );

      const diagnosticsJson = formatDiagnostics(testError, 'SidePanelApp');
      const parsed = JSON.parse(diagnosticsJson);

      expect(diagnosticsJson).not.toContain(REAL_LOOKING_KEY);
      expect(diagnosticsJson).not.toContain('leetcode problem statement with proprietary');
      expect(parsed.error.message).toContain('[REDACTED_API_KEY]');
      expect(parsed.error.message).toContain('[REDACTED_PAGE_CONTENT]');
      expect(parsed.component).toBe('SidePanelApp');
      expect(parsed.app).toBe('Unstuck');
    });

    it('sanitizes URL query parameters containing keys from diagnostics', () => {
      const urlError = new Error('Failed GET https://generativelanguage.googleapis.com/v1beta/models?key=' + REAL_LOOKING_KEY);
      const sanitized = sanitizeDiagnosticsText(urlError.message);

      expect(sanitized).not.toContain(REAL_LOOKING_KEY);
      expect(sanitized).toContain('?[REDACTED_QUERY]');
    });

    it('copies sanitized diagnostics to clipboard upon clicking "Copy diagnostics"', async () => {
      let clipboardContent = '';
      const writeTextMock = vi.fn(async (text: string) => {
        clipboardContent = text;
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      await act(async () => {
        root.render(
          <ErrorBoundary componentName="ClipboardTest">
            <ProblematicChild shouldThrow={true} message={`Error with key ${REAL_LOOKING_KEY}`} />
          </ErrorBoundary>
        );
      });

      const copyBtn = container.querySelector('[data-testid="error-copy-diagnostics-btn"]') as HTMLButtonElement;
      expect(copyBtn).not.toBeNull();

      await act(async () => {
        copyBtn.click();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(clipboardContent).not.toContain(REAL_LOOKING_KEY);
      expect(clipboardContent).toContain('[REDACTED_API_KEY]');
      expect(container.textContent).toContain('Copied!');
    });
  });
});
