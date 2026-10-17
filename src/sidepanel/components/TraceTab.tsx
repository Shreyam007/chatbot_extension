import React, { useState } from 'react';
import {
  Radar,
  Brain,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Timer,
  ArrowUpDown,
  AlertOctagon,
  ExternalLink,
} from 'lucide-react';
import type { AgentRunTrace } from '../../background/graph/types';

export interface TraceTabProps {
  traces: AgentRunTrace[];
  activePStuck?: number;
  activeThreshold?: number;
  sensitivity?: 'low' | 'medium' | 'high';
  contributions?: {
    dwell?: number;
    scrollReversals?: number;
    wrongSubmissions?: number;
    tabSwitches?: number;
  };
}

export const TraceTab: React.FC<TraceTabProps> = ({
  traces,
  activePStuck = 0,
  activeThreshold,
  sensitivity = 'medium',
  contributions,
}) => {
  const [showAllDetails, setShowAllDetails] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    detector: true,
    planner: true,
    generator: true,
    critic: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!traces || traces.length === 0) {
    return (
      <div className="flex-1 flex flex-col p-6 items-center justify-center text-center gap-2 text-on-surface select-none">
        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary/70 border border-outline-variant/40 mb-2">
          <Radar className="w-5 h-5" />
        </div>
        <h2 className="font-mono text-sm font-semibold text-on-surface">No trace telemetry yet</h2>
        <p className="font-sans text-xs text-on-surface-variant max-w-[260px] leading-relaxed">
          Request a hint or ask a question in chat to view live multi-agent execution telemetry and pipeline benchmarks.
        </p>
      </div>
    );
  }

  const latestTrace = traces[0]!;

  const hasDetector = latestTrace.nodeTimings.some((n) => n.node === 'detector');
  const hasPlanner = latestTrace.nodeTimings.some((n) => n.node === 'planner');
  const isUserInitiated = Boolean(latestTrace.userInitiated) || (!hasDetector && !hasPlanner);

  const effectiveThreshold =
    activeThreshold ??
    (sensitivity === 'high' ? 0.45 : sensitivity === 'low' ? 0.75 : 0.60);

  const totalLatency = latestTrace.totalDurationMs > 0
    ? (latestTrace.totalDurationMs / 1000).toFixed(1) + 's'
    : '—';
  const requestedLevel = latestTrace.requestedLevel ?? 1;

  const detectorTiming = latestTrace.nodeTimings.find((n) => n.node === 'detector');
  const detectorMs = detectorTiming ? `${detectorTiming.durationMs}ms` : '—';

  const plannerTiming = latestTrace.nodeTimings.find((n) => n.node === 'planner');
  const plannerMs = plannerTiming ? `${plannerTiming.durationMs}ms` : '—';
  const selectedAction = (plannerTiming?.details?.selectedAction as string) || `nudge_with_level_${requestedLevel}`;
  const contextBucket = (plannerTiming?.details?.bucket as string) || latestTrace.problemHash || '—';

  const genTiming = latestTrace.nodeTimings.find((n) => n.node === 'hint_generator');
  const genMs = genTiming ? `${(genTiming.durationMs / 1000).toFixed(1)}s` : '—';
  const cbTiming = latestTrace.nodeTimings.find((n) => n.node === 'context_builder');
  const statementLen = typeof cbTiming?.details?.statementLength === 'number' ? cbTiming.details.statementLength : 0;
  const tokenBudgetStr = statementLen > 0 ? `${Math.round(statementLen / 4).toLocaleString()} / 4,000 tokens` : '— / 4,000 tokens';

  const criticTiming = latestTrace.nodeTimings.find((n) => n.node === 'critic');
  const criticMs = criticTiming ? `${criticTiming.durationMs}ms` : '—';
  const criticEval = latestTrace.criticEvaluations[0];
  const leakVerdict = criticEval ? (criticEval.leak ? 'Leak detected' : '0 detected (fenced/keywords)') : '—';
  const groundingVerdict = criticEval ? (criticEval.grounded ? 'Grounded in statement text' : 'Ungrounded claim') : '—';
  const judgeVerdict = criticEval ? (criticEval.pass ? 'APPROVED' : (criticEval.reason || 'REJECTED')) : '—';

  return (
    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto custom-scrollbar select-none">
      {/* 1. Trace Header & Controls */}
      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-mono text-sm font-bold text-on-surface tracking-tight">
                Trace
              </h1>
              <span className="text-outline text-xs">•</span>
              <span className="font-mono text-xs text-on-surface-variant">
                Explainable AI (XAI)
              </span>
            </div>
            <p className="font-sans text-xs text-on-surface-variant mt-0.5">
              Telemetry pipeline for latest hint generated{' '}
              <span className="text-on-surface font-mono font-medium">just now</span>
            </p>
          </div>

          {/* Details toggle switch */}
          <div className="flex items-center gap-1.5 bg-surface-container border border-outline-variant/40 rounded-lg px-2 py-1">
            <span className="font-mono text-[10px] text-on-surface-variant">Details</span>
            <button
              onClick={() => {
                const nextState = !showAllDetails;
                setShowAllDetails(nextState);
                setOpenSections({
                  detector: nextState,
                  planner: nextState,
                  generator: nextState,
                  critic: nextState,
                });
              }}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                showAllDetails ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
              title="Toggle all telemetry details"
              aria-label="Toggle all telemetry details"
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                  showAllDetails ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Summary Stat Bento */}
        <div className="grid grid-cols-3 gap-1.5 bg-surface-container-low border border-outline-variant/40 rounded-xl p-2.5">
          <div className="flex flex-col">
            <span className="font-mono text-[9px] uppercase tracking-wider text-outline">
              Latency
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-xs font-bold text-primary">{totalLatency}</span>
              <span className="font-mono text-[9px] text-on-surface-variant">total</span>
            </div>
          </div>

          <div className="flex flex-col border-x border-outline-variant/30 px-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-outline">
              Pipeline
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-mono text-xs font-bold text-on-surface">4/4</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              <span className="font-mono text-[9px] text-primary">passed</span>
            </div>
          </div>

          <div className="flex flex-col pl-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-outline">
              Intervention
            </span>
            <div className="mt-0.5">
              <span className="font-mono text-[10px] font-semibold text-tertiary px-1.5 py-0.2 rounded bg-tertiary/10 border border-tertiary/30">
                L{requestedLevel} Hint
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Agent Pipeline Timeline */}
      <section className="flex flex-col relative mt-1 space-y-3">
        {/* Connecting Line */}
        <div className="absolute left-[15px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary via-primary to-primary-container opacity-30 pointer-events-none" />

        {isUserInitiated ? (
          <div className="bg-surface-container/60 border border-outline-variant/30 rounded-xl p-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs font-mono space-y-0.5 min-w-0">
              <div className="font-semibold text-on-surface">Direct User Request</div>
              <div className="text-[11px] font-sans text-on-surface-variant leading-relaxed">
                Detector and Planner were not involved because you initiated this request directly in Chat.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* AGENT 1: DETECTOR */}
            <div className="relative flex flex-col gap-1.5 group">
              <div
                onClick={() => toggleSection('detector')}
                className="flex items-start gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/60 flex items-center justify-center text-primary z-10 shrink-0 shadow-sm">
                  <Radar className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 bg-surface-container border border-outline-variant/40 rounded-xl p-2.5 hover:border-outline hover:bg-surface-container-high transition-all">
                  <div className="flex items-center justify-between mb-1 gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-semibold text-on-surface truncate">
                        1. Detector Agent
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-primary/10 text-primary border border-primary/30 shrink-0">
                        Triggered
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-outline shrink-0">
                      <span className="font-mono text-[10px]">{detectorMs}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          openSections.detector ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-xs font-mono text-on-surface-variant flex items-center justify-between gap-1 min-w-0">
                    <span className="truncate min-w-0">
                      p(stuck) = <strong className="text-tertiary">{activePStuck > 0 ? activePStuck.toFixed(2) : '—'}</strong>{' '}
                      <span className="text-outline text-[10px]">(threshold &gt; {effectiveThreshold.toFixed(2)})</span>
                    </span>
                    <span className="text-[9px] text-primary bg-primary/10 px-1 rounded shrink-0">
                      Logistic Model
                    </span>
                  </div>

                  {openSections.detector && (
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/30 flex flex-col gap-2">
                      <span className="font-mono text-[9px] text-outline uppercase tracking-wider">
                        Contributing Signal Weights
                      </span>

                      {contributions ? (
                        <>
                          {/* Dwell */}
                          <div className="flex items-center justify-between text-[11px] font-mono gap-1.5 min-w-0">
                            <div className="flex items-center gap-1 text-on-surface-variant flex-1 min-w-0 truncate">
                              <Timer className="w-3 h-3 text-tertiary shrink-0" />
                              <span className="truncate">Dwell weight</span>
                            </div>
                            <div className="flex items-center gap-1.5 w-24 sm:w-28 shrink-0">
                              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-tertiary h-full rounded-full"
                                  style={{ width: `${Math.round((contributions.dwell ?? 0) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-on-surface w-6 text-right">
                                {(contributions.dwell ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Scroll reversals */}
                          <div className="flex items-center justify-between text-[11px] font-mono gap-1.5 min-w-0">
                            <div className="flex items-center gap-1 text-on-surface-variant flex-1 min-w-0 truncate">
                              <ArrowUpDown className="w-3 h-3 text-secondary shrink-0" />
                              <span className="truncate">Scroll reversals</span>
                            </div>
                            <div className="flex items-center gap-1.5 w-24 sm:w-28 shrink-0">
                              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-secondary h-full rounded-full"
                                  style={{ width: `${Math.round((contributions.scrollReversals ?? 0) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-on-surface w-6 text-right">
                                {(contributions.scrollReversals ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Wrong submissions */}
                          <div className="flex items-center justify-between text-[11px] font-mono gap-1.5 min-w-0">
                            <div className="flex items-center gap-1 text-on-surface-variant flex-1 min-w-0 truncate">
                              <AlertOctagon className="w-3 h-3 text-error shrink-0" />
                              <span className="truncate">Wrong verdicts</span>
                            </div>
                            <div className="flex items-center gap-1.5 w-24 sm:w-28 shrink-0">
                              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-error h-full rounded-full"
                                  style={{ width: `${Math.round((contributions.wrongSubmissions ?? 0) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-on-surface w-6 text-right">
                                {(contributions.wrongSubmissions ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Tab switches */}
                          <div className="flex items-center justify-between text-[11px] font-mono gap-1.5 min-w-0">
                            <div className="flex items-center gap-1 text-on-surface-variant flex-1 min-w-0 truncate">
                              <ExternalLink className="w-3 h-3 text-outline shrink-0" />
                              <span className="truncate">Tab switches</span>
                            </div>
                            <div className="flex items-center gap-1.5 w-24 sm:w-28 shrink-0">
                              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-outline h-full rounded-full"
                                  style={{ width: `${Math.round((contributions.tabSwitches ?? 0) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-on-surface w-6 text-right">
                                {(contributions.tabSwitches ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] font-mono text-outline">
                          No active signal window recorded for current page session.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AGENT 2: PLANNER */}
            <div className="relative flex flex-col gap-1.5 group">
              <div
                onClick={() => toggleSection('planner')}
                className="flex items-start gap-2.5 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/60 flex items-center justify-center text-primary z-10 shrink-0 shadow-sm">
                  <Brain className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 bg-surface-container border border-outline-variant/40 rounded-xl p-2.5 hover:border-outline hover:bg-surface-container-high transition-all">
                  <div className="flex items-center justify-between mb-1 gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-semibold text-on-surface truncate">
                        2. Planner Agent
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-primary/10 text-primary border border-primary/30 shrink-0">
                        Approved
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-outline shrink-0">
                      <span className="font-mono text-[10px]">{plannerMs}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          openSections.planner ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-xs font-mono text-on-surface-variant flex items-center justify-between gap-1 min-w-0">
                    <span className="truncate">Bandit Policy</span>
                    <span className="text-[9px] text-secondary bg-secondary/10 px-1 rounded shrink-0">
                      Contextual Bandit
                    </span>
                  </div>

                  {openSections.planner && (
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/30 font-mono text-[10px] space-y-1 text-on-surface-variant">
                      <div className="flex justify-between gap-1 min-w-0">
                        <span className="text-outline shrink-0">Hard Gates:</span>
                        <span className="text-primary font-medium truncate">PASSED (no contest/cooldown)</span>
                      </div>
                      <div className="flex justify-between gap-1 min-w-0">
                        <span className="text-outline shrink-0">Selected Action:</span>
                        <span className="text-on-surface font-semibold truncate">{selectedAction}</span>
                      </div>
                      <div className="flex justify-between gap-1 min-w-0">
                        <span className="text-outline shrink-0">Context Bucket:</span>
                        <span className="text-secondary truncate max-w-[150px]">{contextBucket}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* AGENT 3: GENERATOR */}
        <div className="relative flex flex-col gap-1.5 group">
          <div
            onClick={() => toggleSection('generator')}
            className="flex items-start gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/60 flex items-center justify-center text-primary z-10 shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 bg-surface-container border border-outline-variant/40 rounded-xl p-2.5 hover:border-outline hover:bg-surface-container-high transition-all">
              <div className="flex items-center justify-between mb-1 gap-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-on-surface truncate">
                    3. Generator Agent
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-primary/10 text-primary border border-primary/30 shrink-0">
                    Done
                  </span>
                </div>
                <div className="flex items-center gap-1 text-outline shrink-0">
                  <span className="font-mono text-[10px]">{genMs}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      openSections.generator ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="text-xs font-mono text-on-surface-variant flex items-center justify-between gap-1 min-w-0">
                <span className="truncate">Model: {latestTrace.model || 'gemini-2.5-flash'}</span>
                <span className="text-[9px] text-primary bg-primary/10 px-1 rounded shrink-0">
                  JSON Schema
                </span>
              </div>

              {openSections.generator && (
                <div className="mt-2.5 pt-2 border-t border-outline-variant/30 font-mono text-[10px] space-y-1 text-on-surface-variant">
                  <div className="flex justify-between gap-1 min-w-0">
                    <span className="text-outline shrink-0">Context Budget:</span>
                    <span className="truncate">{tokenBudgetStr}</span>
                  </div>
                  <div className="flex justify-between gap-1 min-w-0">
                    <span className="text-outline shrink-0">Retries:</span>
                    <span>{latestTrace.retries ?? 0}</span>
                  </div>
                  <div className="flex justify-between gap-1 min-w-0">
                    <span className="text-outline shrink-0">Boundary:</span>
                    <span className="text-primary font-mono text-[9px] truncate">&lt;&lt;&lt;UNTRUSTED_PAGE_DATA&gt;&gt;&gt;</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AGENT 4: CRITIC */}
        <div className="relative flex flex-col gap-1.5 group">
          <div
            onClick={() => toggleSection('critic')}
            className="flex items-start gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/60 flex items-center justify-center text-primary z-10 shrink-0 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 bg-surface-container border border-outline-variant/40 rounded-xl p-2.5 hover:border-outline hover:bg-surface-container-high transition-all">
              <div className="flex items-center justify-between mb-1 gap-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-on-surface truncate">
                    4. Critic Agent
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-primary/10 text-primary border border-primary/30 shrink-0">
                    Evaluated
                  </span>
                </div>
                <div className="flex items-center gap-1 text-outline shrink-0">
                  <span className="font-mono text-[10px]">{criticMs}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      openSections.critic ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="text-xs font-mono text-on-surface-variant flex items-center justify-between gap-1 min-w-0">
                <span className="truncate flex-1 min-w-0">Leak check: {leakVerdict}</span>
                <span className="text-[9px] text-primary bg-primary/10 px-1 rounded shrink-0">
                  Dual Critic
                </span>
              </div>

              {openSections.critic && (
                <div className="mt-2.5 pt-2 border-t border-outline-variant/30 font-mono text-[10px] space-y-1 text-on-surface-variant">
                  <div className="flex justify-between gap-1 min-w-0">
                    <span className="text-outline shrink-0">Deterministic Leaks:</span>
                    <span className="text-primary font-medium truncate max-w-[150px]">{leakVerdict}</span>
                  </div>
                  <div className="flex justify-between gap-1 min-w-0">
                    <span className="text-outline shrink-0">Grounding Overlap:</span>
                    <span className="text-primary font-medium truncate max-w-[150px]">{groundingVerdict}</span>
                  </div>
                  <div className="flex justify-between gap-1 min-w-0">
                    <span className="text-outline shrink-0">LLM Judge Verdict:</span>
                    <span className="text-primary font-medium truncate max-w-[150px]">{judgeVerdict}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
