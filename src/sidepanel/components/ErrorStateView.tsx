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
} from 'lucide-react';

export type ErrorStateType =
  | 'no_api_key'
  | 'invalid_key'
  | 'offline'
  | 'rate_limited'
  | 'timeout'
  | 'server_error'
  | 'restricted_page';

export interface ErrorStateViewProps {
  type: ErrorStateType;
  retryAfterSeconds?: number;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

export const ErrorStateView: React.FC<ErrorStateViewProps> = ({
  type,
  retryAfterSeconds = 30,
  onRetry,
  onOpenSettings,
}) => {
  const [countdown, setCountdown] = useState(retryAfterSeconds);

  useEffect(() => {
    setCountdown(retryAfterSeconds);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (type !== 'rate_limited' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [type, countdown]);

  if (type === 'no_api_key' || type === 'invalid_key') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
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
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed">
          {type === 'invalid_key'
            ? 'The configured Gemini API key failed authentication. Please verify your key in options.'
            : 'Unstuck runs 100% in your browser using your own Gemini API key. Stored securely in chrome.storage.local.'}
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-outline mb-3 shadow-lg">
          <WifiOff className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-outline mb-2">
          S13.2 Offline Mode
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          You're offline
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed">
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-tertiary mb-3 shadow-lg">
          <Clock className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-tertiary mb-2">
          S13.3 HTTP 429 Rate Limited
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          Quota Rate Limited
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-3 leading-relaxed">
          Gemini requests hit the per-minute quota. Live countdown is holding to prevent rejection.
        </p>
        <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/40 font-mono text-xs text-primary mb-4">
          <span>Cooldown: {countdown}s remaining</span>
        </div>
        {countdown === 0 && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Generation Now</span>
          </button>
        )}
      </div>
    );
  }

  if (type === 'timeout' || type === 'server_error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-error mb-3 shadow-lg">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-error mb-2">
          S13.4 {type === 'timeout' ? 'Timeout (20s)' : 'Server Error (5xx)'}
        </div>
        <h2 className="text-base font-mono font-bold text-on-surface mb-1">
          {type === 'timeout' ? 'Request Timed Out' : 'Temporary AI Service Error'}
        </h2>
        <p className="text-xs font-sans text-on-surface-variant max-w-[280px] mb-4 leading-relaxed">
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
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center text-outline mb-3 shadow-lg">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-outline mb-2">
        S13.5 Restricted Context
      </div>
      <h2 className="text-base font-mono font-bold text-on-surface mb-1">
        Can't run on this page
      </h2>
      <p className="text-xs font-sans text-on-surface-variant max-w-[280px] leading-relaxed">
        Chrome extensions cannot execute scripts on chrome:// or Web Store internal pages. Navigate to LeetCode or Codeforces to start.
      </p>
    </div>
  );
};
