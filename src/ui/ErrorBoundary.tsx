import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../shared/config';
import { createLogger, redactSecrets } from '../shared/logger';

const logger = createLogger('ErrorBoundary');

export interface ErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

/**
 * Sanitizes an error message or stack trace so it never exposes API keys,
 * authentication tokens, raw page URLs, or scraped problem statement contents.
 */
export function sanitizeDiagnosticsText(text: string): string {
  if (!text) return '';

  // 1. Redact API keys and credential strings
  let sanitized = redactSecrets(text);

  // 2. Redact problem statements, page contexts or query params
  sanitized = sanitized.replace(/(https?:\/\/[^\s?#]+)\?[^\s#]*/gi, '$1?[REDACTED_QUERY]');
  sanitized = sanitized.replace(/<<<UNTRUSTED_PAGE_DATA>>>[\s\S]*?<<<END_UNTRUSTED_DATA>>>/gi, '[REDACTED_PAGE_CONTENT]');
  sanitized = sanitized.replace(/(?:statementText|problemStatement|userCode|scrapedText)\s*[:=]\s*["']?([^"'\n\r]{20,})["']?/gi, '[REDACTED_PAGE_DATA]');

  return sanitized;
}

/**
 * Formats a clean, safe diagnostics report payload for the user clipboard.
 * Guaranteed to never contain API keys, bearer tokens, or raw problem texts.
 */
export function formatDiagnostics(error: Error | null, componentName = 'UnknownComponent'): string {
  const sanitizedMessage = error ? sanitizeDiagnosticsText(error.message) : 'Unknown error';
  const sanitizedStack = error?.stack ? sanitizeDiagnosticsText(error.stack) : undefined;

  const diagnostics = {
    app: APP_NAME,
    version: APP_VERSION,
    timestamp: Date.now(),
    component: componentName,
    error: {
      name: error?.name || 'Error',
      message: sanitizedMessage,
      stack: sanitizedStack,
    },
    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    },
  };

  return JSON.stringify(diagnostics, null, 2);
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const componentName = this.props.componentName || 'UIComponent';
    const safeMsg = sanitizeDiagnosticsText(error.message);
    logger.error(`Unhandled error in ${componentName}: ${safeMsg}`, {
      component: componentName,
      componentStack: sanitizeDiagnosticsText(errorInfo.componentStack || ''),
    });
  }

  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  override componentWillUnmount(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
  }

  handleCopyDiagnostics = async (): Promise<void> => {
    try {
      const text = formatDiagnostics(this.state.error, this.props.componentName);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      this.setState({ copied: true });
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => {
        if (typeof window !== 'undefined') {
          this.setState({ copied: false });
        }
      }, 2500);
    } catch (err) {
      logger.debug('Failed to copy diagnostics to clipboard', err);
    }
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, copied: false });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const componentName = this.props.componentName || 'Extension';
      const safeErrorMessage = this.state.error
        ? sanitizeDiagnosticsText(this.state.error.message)
        : 'An unexpected application error occurred.';

      return (
        <div
          data-testid="error-boundary-fallback"
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center min-h-[180px] p-4 text-center rounded-xl bg-surface-container border border-outline-variant/40 shadow-lg text-on-surface select-none font-sans"
        >
          {/* Warning Icon with amber accent */}
          <div className="w-10 h-10 rounded-full bg-tertiary/15 border border-tertiary/30 flex items-center justify-center mb-3 text-tertiary">
            <AlertTriangle className="w-5 h-5 text-tertiary" />
          </div>

          <h3 className="font-mono text-xs font-semibold text-on-surface mb-1">
            Something went wrong in {componentName}
          </h3>

          <p className="font-sans text-[11px] text-on-surface-variant max-w-[280px] leading-relaxed mb-3">
            An unexpected error occurred. Your session state is preserved locally and your API key remains secure.
          </p>

          <div
            data-testid="sanitized-error-snippet"
            className="w-full max-w-[320px] p-2 mb-3.5 rounded bg-surface-container-lowest border border-outline-variant/30 font-mono text-[10px] text-tertiary text-left truncate"
            title={safeErrorMessage}
          >
            {safeErrorMessage}
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="error-retry-btn"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 font-mono text-xs text-on-surface hover:bg-surface-container-highest transition-colors active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span>Try again</span>
            </button>

            <button
              data-testid="error-copy-diagnostics-btn"
              onClick={this.handleCopyDiagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary/15 border border-tertiary/40 font-mono text-xs text-tertiary hover:bg-tertiary/25 transition-colors active:scale-95"
            >
              {this.state.copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-tertiary" />
                  <span>Copy diagnostics</span>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
