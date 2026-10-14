import React, { useState, useEffect } from 'react';
import { OnboardingWizard } from '../ui/OnboardingWizard';
import { sendToBackground, listenToBroadcastEvents } from '../shared/messaging';
import type { PageContext } from '../shared/schemas/context';
import type { Hint, HintLevel } from '../shared/schemas/hints';
import type { SignalWindow } from '../shared/schemas/signals';
import type { AgentRunTrace } from '../background/graph/types';

import { Header } from './components/Header';
import { Navigation, type SidePanelTab } from './components/Navigation';
import { ChatTab, type ChatMessage } from './components/ChatTab';
import { HintsTab } from './components/HintsTab';
import { TraceTab } from './components/TraceTab';
import { ProgressTab, type TopicProgress } from './components/ProgressTab';
import { SolvedModal } from './components/SolvedModal';
import { ErrorStateView, type ErrorStateType } from './components/ErrorStateView';
import { ContextualStateView } from './components/ContextualStateView';
import { SendPreviewModal } from './components/SendPreviewModal';
import type { Settings } from '../shared/schemas/settings';

export const SidePanelApp: React.FC = () => {
  // Onboarding & Status state
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Active Context & Telemetry
  const [context, setContext] = useState<PageContext | null>(null);
  const [signals, setSignals] = useState<SignalWindow | null>(null);
  const [pStuck, setPStuck] = useState<number>(0);
  const [isContest, setIsContest] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<SidePanelTab>('hints');

  // Hints State
  const [currentLevel, setCurrentLevel] = useState<HintLevel>(1);
  const [activeHint, setActiveHint] = useState<Hint | null>(null);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<ErrorStateType | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>(3);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Trace & Progress State
  const [traces, setTraces] = useState<AgentRunTrace[]>([]);
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [weeklySolved, setWeeklySolved] = useState<number>(0);
  const [hintsPerSolve, setHintsPerSolve] = useState<number>(0);
  const [nudgeAcceptRate, setNudgeAcceptRate] = useState<number>(0);

  // Solved Modal
  const [showSolvedModal, setShowSolvedModal] = useState<boolean>(false);

  // Settings & Send Preview Modal State
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'hint'; level: HintLevel }
    | { type: 'chat'; query: string; level?: HintLevel }
    | null
  >(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    // Check onboarding
    sendToBackground<{ type: string; state: { completed?: boolean } }>({ type: 'GET_ONBOARDING' })
      .then((res) => {
        setOnboardingComplete(Boolean(res?.state?.completed));
      })
      .catch(() => setOnboardingComplete(true));

    // Fetch settings
    sendToBackground<{ type: string; settings: Settings }>({ type: 'GET_SETTINGS' })
      .then((res) => {
        if (res?.settings) {
          setSettings(res.settings);
          if (res.settings.demoMode !== undefined) {
            setDemoMode(Boolean(res.settings.demoMode));
          }
        }
      })
      .catch(() => {});

    // Check status & API key
    sendToBackground<{ type: string; status: { hasApiKey: boolean; isContest: boolean } }>({
      type: 'GET_STATUS',
    })
      .then((res) => {
        if (res?.status) {
          setHasApiKey(res.status.hasApiKey);
          setIsContest(res.status.isContest);
        }
      })
      .catch(() => {});

    // Fetch active problem context
    sendToBackground<{
      type: string;
      context: PageContext | null;
      signals: SignalWindow | null;
      pStuck: number;
      isContest: boolean;
      isPaused: boolean;
    }>({ type: 'GET_PROBLEM_CONTEXT' })
      .then((res) => {
        if (res?.context) {
          setContext(res.context);
          setSignals(res.signals);
          setPStuck(res.pStuck);
          setIsContest(res.isContest);
          setIsPaused(res.isPaused);
          loadHintsHistory(res.context.url);
        } else {
          setContext(null);
          setActiveHint(null);
        }
      })
      .catch(() => {
        setContext(null);
        setActiveHint(null);
      });

    // Fetch traces & mastery
    loadTelemetryAndMastery();

    // Online/offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to background broadcast events
    const unsubscribe = listenToBroadcastEvents((event) => {
      if (event.event === 'CONTEST_DETECTED') {
        setIsContest(true);
      } else if (event.event === 'NUDGE_OFFERED') {
        setPStuck(event.decision.utility);
        if (event.context) setContext(event.context);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const loadHintsHistory = async (problemHash: string) => {
    try {
      const res = await sendToBackground<{ type: string; hints: Hint[] }>({
        type: 'GET_HINTS_HISTORY',
        problemHash,
      });
      if (res?.hints && res.hints.length > 0) {
        const last = res.hints[res.hints.length - 1];
        if (last) {
          setActiveHint(last);
          setCurrentLevel(last.level);
        }
      } else {
        setActiveHint(null);
        setCurrentLevel(1);
      }
    } catch {
      setActiveHint(null);
      setCurrentLevel(1);
    }
  };

  const loadTelemetryAndMastery = async () => {
    try {
      const tracesRes = await sendToBackground<{ type: string; traces: AgentRunTrace[] }>({
        type: 'GET_RUN_TRACES',
      });
      if (tracesRes?.traces) {
        setTraces(tracesRes.traces);
      }

      const masteryRes = await sendToBackground<{
        type: string;
        topics: TopicProgress[];
        weeklySolved: number;
        hintsPerSolve: number;
        nudgeAcceptRate: number;
      }>({ type: 'GET_MASTERY_PROGRESS' });
      if (masteryRes?.topics) {
        setTopics(masteryRes.topics);
        setWeeklySolved(masteryRes.weeklySolved);
        setHintsPerSolve(masteryRes.hintsPerSolve);
        setNudgeAcceptRate(masteryRes.nudgeAcceptRate);
      }
    } catch {
      // Best-effort
    }
  };

  const getContextOrigin = (): string => {
    if (!context?.url) return '';
    try {
      return new URL(context.url).origin;
    } catch {
      return '';
    }
  };

  const shouldPromptSendPreview = (): boolean => {
    if (!context) return false;
    // Known platforms are pre-confirmed
    if (context.site === 'leetcode' || context.site === 'codeforces') return false;
    const origin = getContextOrigin();
    if (!origin) return false;
    const isConfirmed = settings?.confirmedSendSites?.includes(origin);
    const isNeverSend = settings?.neverSendPageTextSites?.includes(origin);
    return !isConfirmed && !isNeverSend;
  };

  // 2. Actions
  const executeNextLevel = async (targetLevel: HintLevel) => {
    if (!context) return;
    setIsHintLoading(true);
    setErrorState(null);

    const requestId = `hint-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await sendToBackground<{ type: string; hint: Hint }>({
        type: 'REQUEST_HINT',
        level: targetLevel,
        problemHash: context.url,
        requestId,
      });

      if (res?.hint) {
        setActiveHint(res.hint);
        setCurrentLevel(res.hint.level);
        loadTelemetryAndMastery();
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
      const msg = err instanceof Error ? err.message : String(err);
      if (code === 'NO_KEY' || msg.includes('NO_KEY')) {
        setErrorState('no_api_key');
      } else if (code === 'INVALID_KEY' || msg.includes('INVALID_KEY') || msg.includes('403') || msg.includes('permission_denied')) {
        setErrorState('invalid_key');
      } else if (code === 'TIMEOUT' || msg.includes('TIMEOUT') || msg.includes('timed out')) {
        setErrorState('timeout');
      } else if (code === 'RATE_LIMITED' || msg.includes('RATE_LIMITED') || msg.includes('429')) {
        setErrorState('rate_limited');
        setRetryAfterSeconds(3);
      } else if (code === 'OFFLINE' || msg.includes('OFFLINE') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('connection')) {
        setErrorState('offline');
      } else {
        setErrorState('timeout');
      }
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleNextLevel = async (targetLevel: HintLevel) => {
    if (!context) return;
    if (shouldPromptSendPreview()) {
      setPendingAction({ type: 'hint', level: targetLevel });
      setShowPreviewModal(true);
      return;
    }
    executeNextLevel(targetLevel);
  };

  const handleMakeMoreDirect = () => {
    handleNextLevel(Math.min(4, currentLevel + 1) as HintLevel);
  };

  const executeSendMessage = async (query: string, level?: HintLevel) => {
    if (!context) return;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);
    setErrorState(null);

    const requestId = `chat-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await sendToBackground<{
        type: string;
        reply: string;
        groundedQuote?: string;
        confidence: number;
        codeBlock?: string;
        criticChecked?: boolean;
        answerable_from_page?: boolean;
      }>({
        type: 'SUBMIT_CHAT_QUERY',
        query,
        problemHash: context.url,
        level: level ?? currentLevel,
        requestId,
      });

      if (res) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: res.reply,
          timestamp: Date.now(),
          groundedQuote: res.groundedQuote,
          confidence: res.confidence,
          codeBlock: res.codeBlock,
          criticChecked: Boolean(res.criticChecked),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        loadTelemetryAndMastery();
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
      const msg = err instanceof Error ? err.message : String(err);
      if (code === 'NO_KEY' || msg.includes('NO_KEY')) {
        setErrorState('no_api_key');
      } else if (code === 'INVALID_KEY' || msg.includes('INVALID_KEY') || msg.includes('403') || msg.includes('permission_denied')) {
        setErrorState('invalid_key');
      } else if (code === 'RATE_LIMITED' || msg.includes('RATE_LIMITED') || msg.includes('429')) {
        setErrorState('rate_limited');
        setRetryAfterSeconds(3);
      } else if (code === 'OFFLINE' || msg.includes('OFFLINE')) {
        setErrorState('offline');
      } else {
        const errorMsg: ChatMessage = {
          id: `asst-err-${Date.now()}`,
          sender: 'assistant',
          text: msg.includes('timed out') || code === 'TIMEOUT'
            ? 'Request timed out after 35s. Please check your network or try again.'
            : `Unable to complete request (${code || 'error'}). Please try again.`,
          timestamp: Date.now(),
          criticChecked: false,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (query: string, level?: HintLevel) => {
    if (!context) return;
    if (shouldPromptSendPreview()) {
      setPendingAction({ type: 'chat', query, level });
      setShowPreviewModal(true);
      return;
    }
    executeSendMessage(query, level);
  };

  const handleConfirmSendPreview = async (payload: {
    trimmedText: string;
    includePageText: boolean;
    neverSendForSite: boolean;
  }) => {
    setShowPreviewModal(false);
    const origin = getContextOrigin();
    if (origin) {
      try {
        await sendToBackground({
          type: 'UPDATE_SITE_PRIVACY',
          origin,
          neverSendPageText: payload.neverSendForSite || !payload.includePageText,
          confirmed: true,
        });
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                confirmedSendSites: Array.from(new Set([...(prev.confirmedSendSites || []), origin])),
                neverSendPageTextSites:
                  payload.neverSendForSite || !payload.includePageText
                    ? Array.from(new Set([...(prev.neverSendPageTextSites || []), origin]))
                    : prev.neverSendPageTextSites,
              }
            : prev
        );
      } catch {
        // Best-effort
      }
    }

    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    if (action.type === 'hint') {
      executeNextLevel(action.level);
    } else if (action.type === 'chat') {
      executeSendMessage(action.query, action.level);
    }
  };

  const handleCancelSendPreview = () => {
    setShowPreviewModal(false);
    setPendingAction(null);
  };

  const handleHighlightQuote = (quote: string) => {
    sendToBackground({
      type: 'HIGHLIGHT_PAGE_TEXT',
      text: quote,
    }).catch(() => {});
  };

  const handleTogglePause = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      await sendToBackground({ type: 'SET_PAUSED', paused: nextState });
    } catch {
      // Best-effort
    }
  };

  const handleFeedback = (hintId: string, helpful: boolean, reason?: string) => {
    sendToBackground({
      type: 'RECORD_HINT_FEEDBACK',
      hintId,
      helpful,
      reason,
    }).catch(() => {});
  };

  const handleSolved = () => {
    if (context) {
      sendToBackground({
        type: 'RECORD_SOLVED',
        problemHash: context.url,
        hintsUsedCount: currentLevel,
      }).catch(() => {});
    }
    setShowSolvedModal(true);
  };

  const handleOpenSettings = () => {
    try {
      const optionsUrl = chrome.runtime?.getURL ? chrome.runtime.getURL('options.html') : 'options.html';
      window.open(optionsUrl, '_blank');
    } catch {
      if (chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    }
  };

  // 3. Onboarding Guard
  if (onboardingComplete === false) {
    return (
      <div className="flex flex-col h-screen bg-surface text-on-surface antialiased overflow-y-auto p-2">
        <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-surface text-on-surface antialiased overflow-hidden select-none">
      {/* Top Telemetry Header */}
      <Header
        context={context}
        isWatching={!isPaused && !isContest}
        isPaused={isPaused}
        isContest={isContest}
        demoMode={demoMode}
        onTogglePause={handleTogglePause}
        onOpenSettings={handleOpenSettings}
      />

      {/* 4-Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        chatBadgeCount={messages.length > 0 ? messages.length : undefined}
      />

      {/* Main View Canvas */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-background">
        {/* Offline Global Error View (S13.2) */}
        {!isOnline ? (
          <ErrorStateView type="offline" onRetry={() => setIsOnline(navigator.onLine)} />
        ) : !hasApiKey ? (
          /* No API Key Error View (S13.1) */
          <ErrorStateView type="no_api_key" onOpenSettings={handleOpenSettings} />
        ) : errorState ? (
          /* Error views (S13.3 - S13.5) */
          <ErrorStateView
            type={errorState}
            retryAfterSeconds={retryAfterSeconds}
            onRetry={() => handleNextLevel(currentLevel)}
            onOpenSettings={handleOpenSettings}
          />
        ) : isPaused && activeTab === 'hints' ? (
          /* Paused Contextual View (S14.3) */
          <ContextualStateView type="paused" onResume={handleTogglePause} />
        ) : isContest && activeTab === 'hints' ? (
          /* Contest Fairness Lock View (S14.2) */
          <ContextualStateView type="contest" />
        ) : context?.isSensitive && activeTab === 'hints' ? (
          /* Sensitive Page Guardrail View */
          <ContextualStateView
            type="sensitive"
            sensitiveReason={context.sensitiveReason}
            onOpenChat={() => setActiveTab('chat')}
          />
        ) : context?.isSparse && activeTab === 'hints' ? (
          /* Sparse Content Portal View */
          <ContextualStateView
            type="sparse"
            onOpenChat={() => setActiveTab('chat')}
            onSelectText={() => setActiveTab('chat')}
          />
        ) : !context && activeTab === 'hints' ? (
          /* No Problem Detected View (S14.1) */
          <ContextualStateView
            type="no_problem"
            onOpenChat={() => setActiveTab('chat')}
            onSelectText={() => setActiveTab('chat')}
            onUseWholePage={() => setActiveTab('chat')}
          />
        ) : (
          /* Standard Active Tabs */
          <>
            {activeTab === 'chat' && (
              <ChatTab
                messages={messages}
                isLoading={isChatLoading}
                onSendMessage={handleSendMessage}
                onHighlightQuote={handleHighlightQuote}
                siteName={context?.site ?? 'LeetCode'}
              />
            )}

            {activeTab === 'hints' && (
              <HintsTab
                currentLevel={currentLevel}
                activeHint={activeHint}
                isLoading={isHintLoading}
                onNextLevel={handleNextLevel}
                onMakeMoreDirect={handleMakeMoreDirect}
                onSolved={handleSolved}
                onFeedback={handleFeedback}
                contentType={context?.contentType}
              />
            )}

            {activeTab === 'trace' && (
              <TraceTab
                traces={traces}
                activePStuck={pStuck}
                contributions={signals ? {
                  dwell: Math.min(1, (signals.dwellMs / 1000) / 300),
                  scrollReversals: Math.min(1, signals.scrollReversals / 10),
                  wrongSubmissions: Math.min(1, signals.wrongSubmissions / 3),
                  tabSwitches: Math.min(1, signals.tabSwitches / 6),
                } : undefined}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressTab
                topics={topics}
                weeklySolved={weeklySolved}
                hintsPerSolve={hintsPerSolve}
                nudgeAcceptRate={nudgeAcceptRate}
              />
            )}
          </>
        )}
      </main>

      {/* Solved Summary Modal (S12) */}
      {showSolvedModal && (
        <SolvedModal
          problemTitle={context?.title || 'Current Problem'}
          hintsUsedCount={currentLevel}
          topic={context?.tags?.[0] ?? '—'}
          onDismiss={() => setShowSolvedModal(false)}
        />
      )}

      {/* Send Preview Modal */}
      {showPreviewModal && (
        <SendPreviewModal
          siteOrigin={getContextOrigin()}
          question={pendingAction?.type === 'chat' ? pendingAction.query : 'Initial hint request'}
          extractedText={context?.selectedText || context?.statementText || ''}
          onConfirm={handleConfirmSendPreview}
          onCancel={handleCancelSendPreview}
        />
      )}
    </div>
  );
};
