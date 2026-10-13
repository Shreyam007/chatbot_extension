import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export interface TopicProgress {
  topic: string;
  pKnown: number;
  attempts: number;
  hintsUsed: number;
  recentProblems?: Array<{ title: string; hintsUsed: number; mastered: boolean }>;
}

export interface ProgressTabProps {
  topics?: TopicProgress[];
  weeklySolved?: number;
  hintsPerSolve?: number;
  nudgeAcceptRate?: number;
}

export const ProgressTab: React.FC<ProgressTabProps> = ({
  topics = [],
  weeklySolved = 0,
  hintsPerSolve = 0,
  nudgeAcceptRate = 0,
}) => {
  const [filterWeakOnly, setFilterWeakOnly] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topic]: !prev[topic] }));
  };

  const displayedTopics = filterWeakOnly
    ? topics.filter((t) => t.pKnown < 0.6)
    : topics;

  return (
    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto custom-scrollbar select-none">
      {/* 1. Top Summary Metrics (3-column compact bento) */}
      <section aria-labelledby="weekly-metrics-heading">
        <h2 className="sr-only" id="weekly-metrics-heading">
          Weekly Progress Metrics
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {/* Solved this week */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-2.5 flex flex-col justify-between min-w-0">
            <span className="font-sans text-[11px] text-on-surface-variant leading-tight truncate">
              Solved this week
            </span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="font-mono text-xl text-on-surface font-bold tracking-tight">
                {weeklySolved}
              </span>
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant truncate">
              <span>{weeklySolved > 0 ? `${weeklySolved} completed` : '—'}</span>
            </div>
          </div>

          {/* Hints per solve */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-2.5 flex flex-col justify-between min-w-0">
            <span className="font-sans text-[11px] text-on-surface-variant leading-tight truncate">
              Hints per solve
            </span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="font-mono text-xl text-on-surface font-bold tracking-tight">
                {hintsPerSolve > 0 ? hintsPerSolve.toFixed(1) : '—'}
              </span>
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant truncate">
              <span>{hintsPerSolve > 0 ? 'Current rate' : '—'}</span>
            </div>
          </div>

          {/* Nudge accept rate */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-2.5 flex flex-col justify-between min-w-0">
            <span className="font-sans text-[11px] text-on-surface-variant leading-tight truncate">
              Nudge accept
            </span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="font-mono text-xl text-on-surface font-bold tracking-tight">
                {nudgeAcceptRate > 0 ? `${Math.round(nudgeAcceptRate * 100)}%` : '—'}
              </span>
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant truncate">
              <span>{nudgeAcceptRate > 0 ? 'Acceptance rate' : '—'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Hints Needed Per Problem (Last 10) Line Chart */}
      <section className="bg-surface-container border border-outline-variant/30 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-xs font-semibold text-on-surface">
              Hints needed per problem
            </h3>
            <p className="font-sans text-[11px] text-on-surface-variant">
              Trend across completed submissions
            </p>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-primary border border-primary/20">
            Telemetry
          </span>
        </div>

        {weeklySolved === 0 ? (
          <div className="p-4 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/20 text-center">
            <p className="font-sans text-xs text-on-surface-variant">
              No problem completion history yet. Complete problems with Unstuck to track hint reduction trends.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-surface-container-high/60 border border-outline-variant/30 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
              Tracking completed problems. As you reinforce algorithmic invariants, your need for higher hint levels decreases.
            </p>
          </div>
        )}
      </section>

      {/* 3. Topic Mastery Section with Drilldowns */}
      <section className="bg-surface-container border border-outline-variant/30 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-mono text-xs font-semibold text-on-surface">Topic mastery</h3>
            <p className="font-sans text-[11px] text-on-surface-variant">
              Calibrated from Bayesian Knowledge Tracing
            </p>
          </div>

          {topics.length > 0 && (
            <button
              data-testid="focus-weak-btn"
              onClick={() => setFilterWeakOnly(!filterWeakOnly)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] transition-colors border ${
                filterWeakOnly
                  ? 'bg-tertiary/20 text-tertiary border-tertiary'
                  : 'text-primary border-primary/30 hover:bg-surface-container-high'
              }`}
            >
              <span>{filterWeakOnly ? 'Showing weak' : 'Focus weak'}</span>
              <Filter className="w-3 h-3" />
            </button>
          )}
        </div>

        {displayedTopics.length === 0 ? (
          <div className="p-4 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/20 text-center">
            <p className="font-sans text-xs text-on-surface-variant">
              No topic mastery recorded yet. Start solving problems to track Bayesian Knowledge Tracing scores.
            </p>
          </div>
        ) : (
          /* Topics Accordion List */
          <div className="space-y-2">
            {displayedTopics.map((topic) => {
              const isExpanded = Boolean(expandedTopics[topic.topic]);
              const pct = Math.round(topic.pKnown * 100);
              const isWeak = topic.pKnown < 0.6;

              return (
                <div
                  key={topic.topic}
                  className="rounded-lg bg-surface-container-low border border-outline-variant/40 overflow-hidden"
                >
                  <div
                    onClick={() => toggleTopic(topic.topic)}
                    className="p-2.5 cursor-pointer hover:bg-surface-container-high/40 transition-colors flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                        )}
                        <span className="font-mono text-xs text-on-surface font-medium truncate">
                          {topic.topic}
                        </span>
                        {isWeak && (
                          <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-tertiary/20 text-tertiary border border-tertiary/30 shrink-0">
                            Weak
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold text-on-surface shrink-0">{pct}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isWeak ? 'bg-tertiary' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded Drilldown */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-outline-variant/20 bg-surface-container-lowest/40 font-mono text-[10px]">
                      <div className="flex justify-between text-on-surface-variant py-0.5 min-w-0">
                        <span className="truncate">Practice attempts: {topic.attempts}</span>
                        <span className="truncate">Total hints: {topic.hintsUsed}</span>
                      </div>

                      {topic.recentProblems && topic.recentProblems.length > 0 ? (
                        topic.recentProblems.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 py-1 px-1.5 rounded bg-surface-container-high/40 text-[10px] min-w-0"
                          >
                            <span className="text-on-surface truncate min-w-0 flex-1">{p.title}</span>
                            <span className={`shrink-0 ${p.mastered ? 'text-primary' : 'text-tertiary'}`}>
                              {p.hintsUsed} hint{p.hintsUsed === 1 ? '' : 's'} used
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-outline py-0.5">No recent problems recorded</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Weak Topics Review Action Card */}
        {topics.some((t) => t.pKnown < 0.6) && (
          <div
            data-testid="weak-topics-review-panel"
            className="mt-3 p-3 rounded-xl bg-tertiary/10 border border-tertiary/30 space-y-2 min-w-0"
          >
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-tertiary">
              <BookOpen className="w-4 h-4 text-tertiary shrink-0" />
              <span className="truncate">Recommended Topic Review</span>
            </div>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed break-words">
              Your mastery is calibrated lowest in{' '}
              <strong className="text-on-surface font-semibold">
                {topics
                  .filter((t) => t.pKnown < 0.6)
                  .map((t) => t.topic)
                  .join(', ')}
              </strong>
              . Target these concepts with focused deliberate practice:
            </p>
            <div className="space-y-1.5 pt-1">
              {topics
                .filter((t) => t.pKnown < 0.6)
                .map((t) => (
                  <div
                    key={t.topic}
                    data-testid="weak-topic-recommendation"
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-[11px] font-mono min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0" />
                      <span className="text-on-surface truncate">{t.topic}</span>
                    </div>
                    <span className="text-tertiary font-bold shrink-0">{Math.round(t.pKnown * 100)}%</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
