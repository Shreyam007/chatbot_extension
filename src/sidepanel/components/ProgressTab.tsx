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
  topics = [
    {
      topic: 'Arrays & Hashing',
      pKnown: 0.72,
      attempts: 8,
      hintsUsed: 3,
      recentProblems: [
        { title: 'Two Sum (#1)', hintsUsed: 1, mastered: true },
        { title: 'Container With Most Water (#11)', hintsUsed: 2, mastered: true },
      ],
    },
    {
      topic: 'Two Pointers',
      pKnown: 0.68,
      attempts: 6,
      hintsUsed: 2,
      recentProblems: [{ title: '3Sum (#15)', hintsUsed: 2, mastered: false }],
    },
    {
      topic: 'Binary Search',
      pKnown: 0.54,
      attempts: 4,
      hintsUsed: 4,
      recentProblems: [{ title: 'Search in Rotated Array (#33)', hintsUsed: 3, mastered: false }],
    },
    {
      topic: 'Dynamic Programming',
      pKnown: 0.41,
      attempts: 5,
      hintsUsed: 7,
      recentProblems: [{ title: 'Climbing Stairs (#70)', hintsUsed: 2, mastered: false }],
    },
  ],
  weeklySolved = 6,
  hintsPerSolve = 1.8,
  nudgeAcceptRate = 0.64,
}) => {
  const [filterWeakOnly, setFilterWeakOnly] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({
    'Arrays & Hashing': true,
  });

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topic]: !prev[topic] }));
  };

  const displayedTopics = filterWeakOnly
    ? topics.filter((t) => t.pKnown < 0.6)
    : topics;

  // Last 10 problem hint counts for sparkline
  const recent10Hints = [3, 2, 4, 1, 2, 3, 1, 2, 1, 0];

  return (
    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto custom-scrollbar select-none">
      {/* 1. Top Summary Metrics (3-column compact bento) */}
      <section aria-labelledby="weekly-metrics-heading">
        <h2 className="sr-only" id="weekly-metrics-heading">
          Weekly Progress Metrics
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {/* Solved this week */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-2.5 flex flex-col justify-between">
            <span className="font-sans text-[11px] text-on-surface-variant leading-tight">
              Solved this week
            </span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="font-mono text-xl text-on-surface font-bold tracking-tight">
                {weeklySolved}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 font-mono text-[10px] text-primary">
              <span className="text-[11px]">↑</span>
              <span>+2 vs last</span>
            </div>
          </div>

          {/* Hints per solve */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-2.5 flex flex-col justify-between">
            <span className="font-sans text-[11px] text-on-surface-variant leading-tight">
              Hints per solve
            </span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="font-mono text-xl text-on-surface font-bold tracking-tight">
                {hintsPerSolve}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 font-mono text-[10px] text-primary">
              <span className="text-[11px]">↓</span>
              <span>-0.4 better</span>
            </div>
          </div>

          {/* Nudge accept rate */}
          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-2.5 flex flex-col justify-between">
            <span className="font-sans text-[11px] text-on-surface-variant leading-tight">
              Nudge accept
            </span>
            <div className="my-1 flex items-baseline gap-1">
              <span className="font-mono text-xl text-on-surface font-bold tracking-tight">
                {Math.round(nudgeAcceptRate * 100)}%
              </span>
            </div>
            <div className="font-mono text-[10px] text-on-surface-variant">
              <span>9/14 taken</span>
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
              Trend across last 10 completed submissions
            </p>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-primary border border-primary/20">
            Last 10
          </span>
        </div>

        {/* Sparkline Container */}
        <div className="relative bg-surface-container-lowest/80 rounded-lg p-2.5 border border-outline-variant/20 pt-3">
          <div className="flex items-center justify-between font-mono text-[10px] mb-1 text-on-surface-variant">
            <span>4 Hints (max)</span>
            <span className="text-primary font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Latest: 0 hints (unassisted)
            </span>
            <span>0 Hints (target)</span>
          </div>

          <div className="w-full h-20 relative">
            <svg
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 340 70"
              aria-label="Hints needed trendline chart across last 10 problems"
            >
              <defs>
                <linearGradient id="hintGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4be277" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#4be277" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line stroke="#222a3d" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="340" y1="12" y2="12" />
              <line stroke="#222a3d" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="340" y1="35" y2="35" />
              <line stroke="#222a3d" strokeDasharray="3,3" strokeWidth="1" x1="0" x2="340" y1="58" y2="58" />

              {/* Area fill */}
              <polygon
                fill="url(#hintGradient)"
                points="10,60 10,21 46,34 82,8 118,47 154,34 190,21 226,47 262,34 298,47 334,60 334,60"
              />
              {/* Trendline */}
              <polyline
                fill="none"
                points="10,21 46,34 82,8 118,47 154,34 190,21 226,47 262,34 298,47 334,60"
                stroke="#4be277"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              {/* Plot points */}
              <circle cx="10" cy="21" fill="#4be277" r="2.5" />
              <circle cx="46" cy="34" fill="#4be277" r="2.5" />
              <circle cx="82" cy="8" fill="#ffba61" r="2.5" />
              <circle cx="118" cy="47" fill="#4be277" r="2.5" />
              <circle cx="154" cy="34" fill="#4be277" r="2.5" />
              <circle cx="190" cy="21" fill="#4be277" r="2.5" />
              <circle cx="226" cy="47" fill="#4be277" r="2.5" />
              <circle cx="262" cy="34" fill="#4be277" r="2.5" />
              <circle cx="298" cy="47" fill="#4be277" r="2.5" />
              <circle cx="334" cy="60" fill="#4be277" r="3.5" />
            </svg>
          </div>

          {/* Bottom Axis Labels */}
          <div className="flex justify-between items-center px-1 font-mono text-[9px] text-on-surface-variant/70 pt-1 border-t border-outline-variant/10">
            <span>P-10</span>
            <span>P-8</span>
            <span>P-6</span>
            <span>P-4</span>
            <span>P-2</span>
            <span className="text-primary font-bold">Latest</span>
          </div>

          {/* Accessible Table Alternative */}
          <details className="mt-1 text-[9px] font-mono text-outline">
            <summary className="cursor-pointer hover:text-on-surface-variant">
              View data table alternative
            </summary>
            <table className="w-full mt-1 border border-outline-variant/20 text-left">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="p-1">Problem</th>
                  <th className="p-1">Hints Used</th>
                </tr>
              </thead>
              <tbody>
                {recent10Hints.map((hints, idx) => (
                  <tr key={idx} className="border-b border-outline-variant/10">
                    <td className="p-1">P-{10 - idx}</td>
                    <td className="p-1">{hints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>

        {/* Text Summary Callout */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-container-high/60 border border-outline-variant/30">
          <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
            Average hints decreased by <strong className="text-primary font-semibold">35%</strong> over your last 10 problems. You are reaching Level 3 conceptual hints less frequently.
          </p>
        </div>
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
        </div>

        {/* Topics Accordion List */}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
                      )}
                      <span className="font-mono text-xs text-on-surface font-medium">
                        {topic.topic}
                      </span>
                      {isWeak && (
                        <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-tertiary/20 text-tertiary border border-tertiary/30">
                          Weak
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-on-surface">{pct}%</span>
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
                    <div className="flex justify-between text-on-surface-variant py-0.5">
                      <span>Practice attempts: {topic.attempts}</span>
                      <span>Total hints: {topic.hintsUsed}</span>
                    </div>

                    {topic.recentProblems && topic.recentProblems.length > 0 ? (
                      topic.recentProblems.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-1.5 rounded bg-surface-container-high/40 text-[10px]"
                        >
                          <span className="text-on-surface truncate">{p.title}</span>
                          <span className={p.mastered ? 'text-primary' : 'text-tertiary'}>
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

        {/* 4. Weak Topics Review Action Card */}
        {topics.some((t) => t.pKnown < 0.6) && (
          <div
            data-testid="weak-topics-review-panel"
            className="mt-3 p-3 rounded-xl bg-tertiary/10 border border-tertiary/30 space-y-2"
          >
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-tertiary">
              <BookOpen className="w-4 h-4 text-tertiary" />
              <span>Recommended Topic Review</span>
            </div>
            <p className="font-sans text-[11px] text-on-surface-variant leading-relaxed">
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
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      <span className="text-on-surface">{t.topic}</span>
                    </div>
                    <span className="text-tertiary font-bold">{Math.round(t.pKnown * 100)}%</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
