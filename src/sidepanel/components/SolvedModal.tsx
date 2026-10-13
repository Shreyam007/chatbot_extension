import React from 'react';
import {
  CheckCircle,
  Clock,
  Lightbulb,
  Tag,
  TrendingUp,
  X,
  Sparkles,
} from 'lucide-react';

export interface SolvedModalProps {
  problemTitle: string;
  timeTaken?: string;
  hintsUsedCount?: number;
  topic?: string;
  masteryGain?: string;
  newMasteryPct?: number;
  onDismiss: () => void;
}

export const SolvedModal: React.FC<SolvedModalProps> = ({
  problemTitle,
  timeTaken = '—',
  hintsUsedCount = 0,
  topic = '—',
  masteryGain = '—',
  newMasteryPct = 0,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
      <div className="w-full max-w-[360px] min-w-0 bg-surface rounded-2xl border border-outline-variant shadow-2xl p-4 flex flex-col gap-3 relative overflow-hidden select-none">
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors"
          title="Close solved summary"
          aria-label="Close solved summary"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Calm Celebration Banner */}
        <section className="bg-surface-container-low rounded-xl p-3 border border-outline-variant/30 flex flex-col items-center text-center relative overflow-hidden mt-2">
          <div className="w-10 h-10 rounded-full bg-surface-container-high border border-primary/40 flex items-center justify-center text-primary mb-2 shadow-inner">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-mono text-base font-bold text-on-surface tracking-tight mb-0.5">
            Solved. Nice.
          </h1>
          <p className="font-sans text-[11px] text-on-surface-variant break-words max-w-full">
            {problemTitle} • Verdict Accepted
          </p>
        </section>

        {/* 2x2 Clean Stat Grid */}
        <section className="grid grid-cols-2 gap-2">
          {/* Time Taken */}
          <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/25 flex flex-col justify-between min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant flex items-center gap-1 truncate">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="truncate">Time Taken</span>
            </span>
            <span className="font-mono text-xs font-bold text-on-surface mt-1 truncate">
              {timeTaken}
            </span>
            <span className="font-mono text-[9px] text-outline mt-0.5 truncate">Session time</span>
          </div>

          {/* Hints Used */}
          <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/25 flex flex-col justify-between min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant flex items-center gap-1 truncate">
              <Lightbulb className="w-3 h-3 shrink-0" />
              <span className="truncate">Hints Used</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-xs font-bold text-on-surface">{hintsUsedCount}</span>
              <span className="font-mono text-[9px] text-on-surface-variant">used</span>
            </div>
            <span className="font-mono text-[9px] text-primary mt-0.5 truncate">
              {hintsUsedCount <= 2 ? 'Minimal help' : 'Assisted'}
            </span>
          </div>

          {/* Topic */}
          <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/25 flex flex-col justify-between min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant flex items-center gap-1 truncate">
              <Tag className="w-3 h-3 shrink-0" />
              <span className="truncate">Topic</span>
            </span>
            <span className="font-mono text-xs font-semibold text-on-surface mt-1 truncate">
              {topic}
            </span>
            <span className="font-mono text-[9px] text-on-surface-variant truncate">Pattern matched</span>
          </div>

          {/* Mastery Progress */}
          <div className="bg-surface-container p-2.5 rounded-lg border border-outline-variant/25 flex flex-col justify-between min-w-0">
            <span className="font-mono text-[10px] text-on-surface-variant flex items-center gap-1 truncate">
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span className="truncate">Mastery</span>
            </span>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs">
              <span className="font-bold text-primary shrink-0">{masteryGain}</span>
              <span className="text-on-surface shrink-0">{newMasteryPct}%</span>
            </div>
            <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary rounded-full" style={{ width: `${newMasteryPct}%` }} />
            </div>
          </div>
        </section>

        {/* Insight Callout */}
        <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
            By thinking through the invariants rather than jumping to solution code, you reinforced your memory retention for this pattern.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onDismiss}
          className="w-full py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-bold transition-all shadow-md active:scale-95"
        >
          Keep Practicing
        </button>
      </div>
    </div>
  );
};
