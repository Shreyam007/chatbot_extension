import React, { useState, useEffect } from 'react';
import {
  Key,
  WifiOff,
  Clock,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Settings,
  ExternalLink,
  FileQuestion,
} from 'lucide-react';

export type ErrorStateType =
  | 'no_api_key'
  | 'invalid_key'
  | 'offline'
  | 'rate_limited'
  | 'timeout'
  | 'server_error'
  | 'restricted_page'
  | 'no_page_context';

export interface ErrorStateViewProps {
  type: ErrorStateType;
  retryAfterSeconds?: number;
  quotaKind?: 'per_minute' | 'per_day' | 'unknown';
  isEstimate?: boolean;
  model?: string;
  onRetry?: () => void;
  onOpenSettings?: () => void;
  onSelectText?: () => void;
}

export const ErrorStateView: React.FC<ErrorStateViewProps> = ({
  type,
  retryAfterSeconds = 30,
  quotaKind = 'per_minute',
  isEstimate = false,
  model,
  onRetry,
  onOpenSettings,
  onSelectText,
}) => {
  const [countdown, setCountdown] = useState(retryAfterSeconds);

  useEffect(() => {
    setCountdown(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (type !== 'rate_limited' || quotaKind === 'per_day' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [type, quotaKind, countdown]);

  if (type === 'no_api_key' || type === 'invalid_key') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-tertiary mb-3 shadow-lg">
          <Key className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-tertiary mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
          S13.1 BYOK Setup Required
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          {type === 'invalid_key' ? 'Invalid API Key' : 'Connect your Gemini Key'}
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed break-words">
          {type === 'invalid_key'
            ? 'The configured Gemini API key failed authentication. Please verify your key in options.'
            : "Your key is stored only on this device (chrome.storage.local) and sent only to Google's Gemini API with your requests. We run no servers."}
        </p>
        <button
          onClick={onOpenSettings}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configure API Key</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (type === 'offline') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-outline mb-3 shadow-lg">
          <WifiOff className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-outline mb-2">
          S13.2 Offline Mode
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          You're offline
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed break-words">
          Network connection dropped. Behavioral signal tracking remains active locally, but hint generation requires internet access.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-container-high transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Connection</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'rate_limited') {
    const isDaily = quotaKind === 'per_day';

    return (
      <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-tertiary mb-3 shadow-lg">
          {isDaily ? <AlertCircle className="w-7 h-7 text-amber-500" /> : <Clock className="w-7 h-7" />}
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-tertiary mb-2">
          S13.3 {isDaily ? 'Daily Quota Limit' : 'HTTP 429 Rate Limited'}
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          {isDaily ? 'Daily Quota Exhausted' : 'Quota Rate Limited'}
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-3 leading-relaxed break-words">
          {isDaily
            ? `Your free-tier Gemini API key has exhausted its daily request allowance${model ? ` for ${model}` : ''}. Free daily quotas reset at midnight Pacific Time.`
            : `Gemini requests hit the per-minute quota${model ? ` on ${model}` : ''}. Live countdown is holding to prevent rejection.`}
        </p>

        {!isDaily && (
          <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/40 font-mono text-xs text-primary mb-4">
            {countdown > 0 ? (
              <span>Cooldown: {countdown}s remaining{isEstimate ? ' (estimated)' : ''}</span>
            ) : (
              <span className="text-emerald-500">Cooldown complete — ready to retry</span>
            )}
          </div>
        )}

        {isDaily ? (
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <button
              onClick={onOpenSettings}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Switch Model in Options</span>
            </button>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/60 text-on-surface font-mono text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Check Usage in AI Studio</span>
            </a>
          </div>
        ) : (
          countdown <= 0 && onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Generation Now</span>
            </button>
          )
        )}
      </div>
    );
  }

  if (type === 'no_page_context') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-outline mb-3 shadow-lg">
          <FileQuestion className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-outline mb-2">
          S14.1 Problem Not Detected
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          No Problem Detected
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed break-words">
          No problem statement found on this page. Select problem text with your cursor or switch to freeform chat.
        </p>
        {onSelectText && (
          <button
            onClick={onSelectText}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <span>Open Chat Tab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (type === 'timeout' || type === 'server_error') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-error mb-3 shadow-lg">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-error mb-2">
          S13.4 {type === 'timeout' ? 'Timeout (20s)' : 'Server Error (5xx)'}
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          {type === 'timeout' ? 'Request Timed Out' : 'Temporary AI Service Error'}
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed break-words">
          The safety deadline was exceeded or the upstream endpoint was temporarily unavailable. Your context was preserved.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface font-mono text-xs font-semibold flex items-center gap-1.5 hover:bg-surface-container-high transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // restricted_page
  return (
    <div className="flex-1 w-full min-w-0 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-outline mb-3 shadow-lg">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-outline mb-2">
        S13.5 Restricted Context
      </div>
      <h2 className="text-base font-mono font-bold text-on-surface mb-1">
        Can't run on this page
      </h2>
      <p className="text-xs font-sans text-on-surface-variant max-w-[280px] leading-relaxed break-words">
        Chrome extensions cannot execute scripts on chrome:// or Web Store internal pages. Navigate to LeetCode or Codeforces to start.
      </p>
    </div>
  );
};
