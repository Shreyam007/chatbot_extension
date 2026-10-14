import React from 'react';
import {
  FileSearch,
  Trophy,
  PauseCircle,
  PlayCircle,
  MessageSquare,
  MousePointerClick,
  FileText,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';

export type ContextualStateType =
  | 'no_problem'
  | 'contest'
  | 'paused'
  | 'sensitive'
  | 'sparse';

export interface ContextualStateViewProps {
  type: ContextualStateType;
  url?: string;
  sensitiveReason?: string;
  onResume?: () => void;
  onOpenChat?: () => void;
  onSelectText?: () => void;
  onUseWholePage?: () => void;
}

export const ContextualStateView: React.FC<ContextualStateViewProps> = ({
  type,
  url: _url = '',
  sensitiveReason,
  onResume,
  onOpenChat,
  onSelectText,
  onUseWholePage,
}) => {
  if (type === 'sensitive') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col justify-between p-4 sm:p-5 select-none animate-fadeIn">
        <div className="my-auto space-y-4 text-center px-1">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center text-error shadow-lg">
            <ShieldAlert className="w-7 h-7 text-error" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error/15 border border-error/30 text-[10px] font-mono text-error font-bold tracking-wider uppercase">
              Sensitive Page Guard
            </div>
            <h2 className="text-sm font-mono font-semibold text-on-surface leading-snug">
              Extraction Blocked
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans max-w-[280px] mx-auto break-words">
              {sensitiveReason ||
                'Sensitive authentication, password, or payment forms were detected on this page. Extraction is disabled to protect your privacy.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 max-w-[280px] mx-auto pt-2">
            <button
              onClick={onOpenChat}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Chat Without Page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sparse') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col justify-between p-4 sm:p-5 select-none animate-fadeIn">
        <div className="my-auto space-y-4 text-center px-1">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-secondary shadow-lg">
            <AlertCircle className="w-7 h-7 text-secondary" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-on-surface-variant">
              Sparse Content Portal
            </div>
            <h2 className="text-sm font-mono font-semibold text-on-surface leading-snug">
              Not enough readable text
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans max-w-[280px] mx-auto break-words">
              This landing page or portal contains minimal readable text. You can select specific text on the page to ask about, or chat without page context.
            </p>
          </div>

          <div className="flex flex-col gap-2 max-w-[280px] mx-auto pt-2">
            <button
              onClick={onOpenChat}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Chat Without Page</span>
            </button>

            <button
              onClick={onSelectText}
              className="w-full py-2 px-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface font-mono text-xs hover:bg-surface-container-high flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MousePointerClick className="w-3.5 h-3.5 text-secondary" />
              <span>Select text to ask about</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'no_problem') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col justify-between p-4 sm:p-5 select-none animate-fadeIn">
        <div className="my-auto space-y-4 text-center px-1">
          {/* Icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-secondary shadow-lg">
            <FileSearch className="w-7 h-7 text-secondary" />
          </div>

          {/* Title & Copy */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              S14.1 DOM Parser Idle
            </div>
            <h2 className="text-sm font-mono font-semibold text-on-surface leading-snug">
              I can't find a problem on this page
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans max-w-[280px] mx-auto break-words">
              No standard code question or test harness was detected in the active viewport. Choose how you'd like Unstuck to read this page.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2 max-w-[280px] mx-auto pt-2">
            <button
              onClick={onOpenChat}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Chat Anyway</span>
            </button>

            <button
              onClick={onSelectText}
              className="w-full py-2 px-3 rounded-xl bg-surface-container border border-outline-variant text-on-surface font-mono text-xs hover:bg-surface-container-high flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <MousePointerClick className="w-3.5 h-3.5 text-secondary" />
              <span>Select text to ask about</span>
            </button>

            <button
              onClick={onUseWholePage}
              className="w-full py-1.5 px-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant font-mono text-[11px] hover:text-on-surface transition-colors flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3 h-3" />
              <span>Use whole page text</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'contest') {
    return (
      <div className="flex-1 w-full min-w-0 flex flex-col justify-between p-4 sm:p-5 select-none animate-fadeIn">
        <div className="my-auto space-y-4 text-center px-1">
          {/* Trophy Icon */}
          <div className="w-14 h-14 mx-auto rounded-2xl bg-tertiary-container/15 border border-tertiary-container/40 flex items-center justify-center text-tertiary shadow-lg">
            <Trophy className="w-7 h-7 text-tertiary" />
          </div>

          {/* Title & Copy */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-container/20 border border-tertiary-container/40 text-[10px] font-mono text-tertiary font-bold tracking-wider uppercase">
              S14.2 Contest Fairness Lock
            </div>
            <h2 className="text-sm font-mono font-semibold text-on-surface leading-snug">
              Contest Mode Active
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed font-sans max-w-[280px] mx-auto break-words">
              Active contest environment detected. In accordance with platform honor codes and fair-play regulations, all proactive hints and overlays are locked.
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-left max-w-[280px] mx-auto text-xs font-mono text-on-surface-variant space-y-1">
            <div className="text-[10px] text-outline uppercase">Rule Enforcement:</div>
            <div className="text-on-surface">• Overlays &amp; FAB fully hidden</div>
            <div className="text-on-surface">• LLM hint generation silenced</div>
            <div className="text-on-surface">• Lock releases upon contest finish</div>
          </div>
        </div>
      </div>
    );
  }

  // paused
  return (
    <div className="flex-1 w-full min-w-0 flex flex-col justify-between p-4 sm:p-5 select-none animate-fadeIn">
      <div className="my-auto space-y-4 text-center px-1">
        {/* Pause Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-outline shadow-lg">
          <PauseCircle className="w-7 h-7" />
        </div>

        {/* Title & Copy */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono text-on-surface-variant">
            S14.3 Observation Paused
          </div>
          <h2 className="text-sm font-mono font-semibold text-on-surface leading-snug">
            Tutor is paused
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed font-sans max-w-[280px] mx-auto break-words">
            You paused observation. Unstuck will not compute dwell signals or offer nudges until resumed.
          </p>
        </div>

        {onResume && (
          <div className="pt-2 max-w-[240px] mx-auto">
            <button
              onClick={onResume}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Resume Observation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
