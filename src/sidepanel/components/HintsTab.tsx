import React, { useState } from 'react';
import {
  Check,
  Lock,
  ArrowRight,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Info,
  AlertTriangle,
  Code2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import type { Hint, HintLevel } from '../../shared/schemas/hints';

export interface HintsTabProps {
  currentLevel: HintLevel;
  activeHint: Hint | null;
  isLoading: boolean;
  onNextLevel: (targetLevel: HintLevel) => void;
  onMakeMoreDirect: () => void;
  onSolved: () => void;
  onFeedback: (hintId: string, helpful: boolean, reason?: string) => void;
}

export const HintsTab: React.FC<HintsTabProps> = ({
  currentLevel,
  activeHint,
  isLoading,
  onNextLevel,
  onMakeMoreDirect,
  onSolved,
  onFeedback,
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<'up' | 'down' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [showL4Confirmation, setShowL4Confirmation] = useState(false);

  const handleFeedbackClick = (type: 'up' | 'down') => {
    setSelectedFeedback(type);
    if (type === 'up' && activeHint) {
      onFeedback(activeHint.id || `hint-${currentLevel}`, true);
    }
  };

  const handleReasonClick = (reason: string) => {
    setSelectedReason(reason);
    if (activeHint) {
      onFeedback(activeHint.id || `hint-${currentLevel}`, false, reason);
    }
  };

  const handleRequestNext = () => {
    const nextLevel = Math.min(4, currentLevel + 1) as HintLevel;
    if (nextLevel === 4) {
      setShowL4Confirmation(true);
    } else {
      onNextLevel(nextLevel);
    }
  };

  const confirmL4Unlock = () => {
    setShowL4Confirmation(false);
    onNextLevel(4);
  };

  const levelTitles: Record<HintLevel, { title: string; subtitle: string }> = {
    1: { title: 'Direction', subtitle: 'Conceptual nudge' },
    2: { title: 'Approach', subtitle: 'Algorithmic pattern' },
    3: { title: 'Pseudocode', subtitle: 'Logic scaffold' },
    4: { title: 'Full Code', subtitle: 'Working implementation' },
  };

  return (
    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto custom-scrollbar select-none">
      {/* 1. Pedagogical Stepper (4 Levels) */}
      <section className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
            Pedagogical Stepper
          </span>
          <span className="font-mono text-[10px] text-primary font-semibold">
            Level {currentLevel} of 4
          </span>
        </div>

        {/* 4-Stage Horizontal Progression Nodes */}
        <div className="grid grid-cols-4 gap-1.5 w-full min-w-0">
          {([1, 2, 3, 4] as HintLevel[]).map((lvl) => {
            const isCompleted = currentLevel > lvl;
            const isCurrent = currentLevel === lvl;

            if (isCompleted) {
              return (
                <button
                  key={lvl}
                  onClick={() => onNextLevel(lvl)}
                  className="flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-lg bg-surface-container/60 border border-primary/30 hover:bg-surface-container transition-colors group text-center min-w-0 w-full"
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-mono text-[10px] text-on-surface group-hover:text-primary transition-colors truncate w-full block">
                    L{lvl} {levelTitles[lvl].title.slice(0, 5)}
                  </span>
                  <span className="text-[9px] font-mono text-on-surface-variant/70 leading-none truncate w-full block">
                    Reviewed
                  </span>
                </button>
              );
            }

            if (isCurrent) {
              return (
                <div
                  key={lvl}
                  className="flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-lg bg-surface-container-high border-2 border-primary shadow-[0_0_8px_rgba(34,197,94,0.25)] relative text-center min-w-0 w-full"
                >
                  <span className="absolute -top-1.5 px-1 bg-primary text-on-primary font-mono text-[8px] rounded-full uppercase tracking-tighter">
                    Active
                  </span>
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary font-mono text-xs font-bold mt-0.5 shrink-0">
                    {lvl}
                  </div>
                  <span className="font-mono text-[10px] text-primary font-semibold truncate w-full block">
                    L{lvl} {levelTitles[lvl].title.slice(0, 5)}
                  </span>
                  <span className="text-[9px] font-mono text-primary/80 leading-none truncate w-full block">
                    Active
                  </span>
                </div>
              );
            }

            return (
              <div
                key={lvl}
                className={`flex flex-col items-center gap-1 p-1 sm:p-1.5 rounded-lg bg-surface-container-lowest/50 border min-w-0 w-full ${
                  lvl === 4 ? 'border-tertiary-container/30 opacity-60' : 'border-outline-variant/30 opacity-70'
                } text-center`}
              >
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 ${
                    lvl === 4 ? 'bg-tertiary-container/20 text-tertiary' : 'bg-surface-variant text-on-surface-variant'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                </div>
                <span className={`font-mono text-[10px] truncate w-full block ${lvl === 4 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  L{lvl} {levelTitles[lvl].title.slice(0, 5)}
                </span>
                <span className="text-[9px] font-mono text-on-surface-variant/60 leading-none truncate w-full block">
                  {lvl === 4 ? 'Guarded' : 'Next'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* S06 Agent Loading Skeleton State */}
      {isLoading ? (
        <section className="bg-surface-container border border-outline-variant/40 rounded-xl p-4 flex flex-col gap-3 animate-pulse">
          <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <div className="h-4 w-32 bg-surface-container-high rounded" />
            </div>
            <div className="h-4 w-20 bg-surface-container-high rounded-full" />
          </div>
          <div className="space-y-2 py-2">
            <div className="h-3 w-full bg-surface-container-high rounded" />
            <div className="h-3 w-5/6 bg-surface-container-high rounded" />
            <div className="h-3 w-4/6 bg-surface-container-high rounded" />
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/20">
            <Sparkles className="w-4 h-4 text-primary animate-spin" />
            <span className="font-mono text-[11px] text-on-surface-variant">
              Agent Graph: Critic running leak check &amp; grounding verification...
            </span>
          </div>
        </section>
      ) : !activeHint ? (
        /* Empty State when no hints have been requested */
        <section className="bg-surface-container border border-outline-variant/40 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 select-none">
          <Sparkles className="w-6 h-6 text-primary/70 mb-1" />
          <h2 className="font-mono text-xs font-semibold text-on-surface">No hints requested yet</h2>
          <p className="font-sans text-xs text-on-surface-variant max-w-[260px] leading-relaxed">
            When you're stuck, request a hint to get progressive guidance without code dumps.
          </p>
          <button
            onClick={() => onNextLevel(1)}
            disabled={isLoading}
            className="mt-2 bg-primary hover:bg-primary-container text-on-primary-container font-mono text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            Request Level 1 Hint
          </button>
        </section>
      ) : (
        /* 2. Current Hint Card */
        <section className="bg-surface-container border border-primary/40 rounded-xl p-3.5 relative shadow-md flex flex-col gap-3">
          {/* Top meta badge & confidence score */}
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2 gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <h2 className="font-mono text-xs font-semibold text-on-surface truncate">
                Hint {currentLevel} of 4 — {levelTitles[currentLevel].title}
              </h2>
            </div>

            {/* Confidence Badge with Tooltip */}
            <div
              className="relative group cursor-help flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary shrink-0"
              title="How sure the checker is that this hint matches the problem without revealing spoilers."
            >
              <span className="font-mono text-[10px] font-semibold">
                Confidence {Math.round((activeHint.confidence ?? 0.85) * 100)}%
              </span>
              <Info className="w-3 h-3" />
            </div>
          </div>

          {/* Low confidence warning banner if <= 0.48 */}
          {activeHint.confidence <= 0.48 && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary">
              <AlertTriangle className="w-4 h-4 shrink-0 text-tertiary" />
              <span className="font-mono text-[11px] leading-tight">
                I'm not sure about this one. Treat it as a guess.
              </span>
            </div>
          )}

          {/* Hint Pedagogical Copy */}
          <div className="text-xs font-sans text-on-surface leading-relaxed select-text">
            {activeHint.text}
          </div>

          {/* Code block if present (L3 / L4) */}
          {activeHint.codeBlock ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-2.5 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-mono text-outline border-b border-outline-variant/20 pb-1 mb-1">
                <span>Code Scaffold</span>
                <span className="text-secondary">Level {currentLevel}</span>
              </div>
              <pre className="font-mono text-[11px] text-on-surface overflow-x-auto whitespace-pre custom-scrollbar leading-tight p-1 select-text">
                <code>{activeHint.codeBlock}</code>
              </pre>
            </div>
          ) : currentLevel < 3 ? (
            /* Code Block Reservation Notice for L1/L2 */
            <div className="bg-surface-container-lowest/80 border border-outline-variant/30 rounded-lg p-2 flex items-start gap-2">
              <Code2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-mono text-[11px] text-on-surface font-medium">
                  Code snippets reserved for L3+
                </span>
                <span className="text-[10px] text-on-surface-variant font-sans leading-normal">
                  Structured pseudocode and implementation templates unlock at Level 3.
                </span>
              </div>
            </div>
          ) : null}

          {/* Critic Check Tag */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-outline-variant/20">
            {activeHint.checks?.leak === false && activeHint.checks?.grounded === true ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Checked by Critic:{' '}
                  <span className="text-primary font-medium">
                    {currentLevel < 3 ? 'No spoiler code detected' : 'Pedagogically grounded'}
                  </span>
                </span>
              </>
            ) : activeHint.checks?.grounded === false ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-tertiary shrink-0" />
                <span className="font-mono text-[10px] text-tertiary">
                  Critic:{' '}
                  <span className="font-medium">Ungrounded claim / safe scaffold</span>
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-outline shrink-0" />
                <span className="font-mono text-[10px] text-outline">
                  Critic:{' '}
                  <span className="font-medium">Unverified</span>
                </span>
              </>
            )}
          </div>
        </section>
      )}

      {/* 3. L4 Guarded Double Confirmation Card (if triggered) */}
      {showL4Confirmation ? (
        <section className="bg-surface-container-lowest border-2 border-tertiary rounded-xl p-3 flex flex-col gap-2.5 animate-fadeIn">
          <div className="flex items-center gap-2 text-tertiary">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-mono text-xs font-bold uppercase">
              Guarded: Level 4 Full Solution
            </h3>
          </div>
          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            Level 4 reveals the complete working code solution. Are you sure you want to view it now, or would you like to try coding with the Level 3 scaffold first?
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowL4Confirmation(false)}
              className="flex-1 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface font-mono text-xs hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmL4Unlock}
              className="flex-1 py-1.5 rounded-lg bg-tertiary hover:bg-tertiary-container text-on-tertiary-container font-mono text-xs font-semibold transition-colors shadow-sm"
            >
              Reveal Full Solution
            </button>
          </div>
        </section>
      ) : (
        /* Normal Action Controls Row */
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 w-full min-w-0">
            {/* Primary Action: Next Hint Level */}
            {currentLevel < 4 ? (
              <button
                onClick={handleRequestNext}
                disabled={isLoading}
                className="bg-primary hover:bg-primary-container text-on-primary-container font-mono text-[11px] sm:text-xs px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1 font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 min-w-0"
              >
                <span className="truncate">Next hint (L{currentLevel + 1})</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : (
              <button
                onClick={onMakeMoreDirect}
                disabled={isLoading}
                className="bg-surface-container-high border border-outline-variant text-on-surface font-mono text-[11px] sm:text-xs px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 min-w-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Explain code</span>
              </button>
            )}

            {/* Secondary Action: Make it more direct */}
            <button
              onClick={onMakeMoreDirect}
              disabled={isLoading}
              className="bg-surface-container-high border border-outline-variant/60 text-on-surface hover:border-outline-variant hover:bg-surface-variant font-mono text-[11px] sm:text-xs px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 min-w-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Make it direct</span>
            </button>
          </div>

          {/* Solved It Action */}
          <button
            onClick={onSolved}
            className="w-full py-1 text-center font-mono text-xs text-primary hover:text-primary-fixed hover:underline transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>I solved it!</span>
          </button>
        </section>
      )}

      {/* 4. Feedback & Rating Interaction */}
      <section className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-on-surface-variant">
            Was this hint helpful?
          </span>
          <div className="flex items-center gap-1.5">
            {/* Thumbs up */}
            <button
              onClick={() => handleFeedbackClick('up')}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-mono ${
                selectedFeedback === 'up'
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
              title="Helpful hint"
              aria-label="Helpful hint"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            {/* Thumbs down */}
            <button
              onClick={() => handleFeedbackClick('down')}
              className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-mono ${
                selectedFeedback === 'down'
                  ? 'bg-tertiary/20 text-tertiary border border-tertiary/40'
                  : 'text-on-surface-variant hover:text-tertiary hover:bg-surface-container'
              }`}
              title="Not helpful"
              aria-label="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Thumbs-Down Reason Chips */}
        {selectedFeedback === 'down' && (
          <div className="pt-2 border-t border-outline-variant/20 flex flex-col gap-1.5 animate-fadeIn">
            <span className="font-mono text-[10px] text-on-surface-variant/80">
              Tell us what needs calibration:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['Too vague', 'Gave too much', 'Wrong direction', 'Other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReasonClick(reason)}
                  className={`px-2 py-0.5 rounded-full font-mono text-[11px] transition-colors border ${
                    selectedReason === reason
                      ? 'bg-tertiary/20 border-tertiary text-tertiary font-medium'
                      : 'bg-surface-container border-outline-variant/50 text-on-surface hover:border-primary'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
