import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { OnboardingWizard } from '../ui/OnboardingWizard';
import { sendToBackground, listenToBroadcastEvents } from '../shared/messaging';
import type { PageContext } from '../shared/schemas/context';
import type { Hint, HintLevel } from '../shared/schemas/hints';
import type { SignalWindow } from '../shared/schemas/signals';
import type { AgentRunTrace } from '../background/graph/types';
import type { SubmitChatQueryResponse } from '../shared/messaging/protocol';
import { getPageProfile, hashUrl } from '../shared/page-profile';
import { CancelledError, type CancellationReason } from '../shared/errors/cancellation';

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

  // Active Tab & Page State
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeTabTitle, setActiveTabTitle] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);

  // Active Context & Telemetry
  const [context, setContext] = useState<PageContext | null>(null);
  const [signals, setSignals] = useState<SignalWindow | null>(null);
  const [pStuck, setPStuck] = useState<number>(0);
  const [isContest, setIsContest] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Derived Page Profile
  const pageProfile = useMemo(() => {
    return getPageProfile(context, activeUrl ?? undefined);
  }, [context, activeUrl]);

  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<SidePanelTab>('chat');

  // Enforce Invariant: Hints tab strictly enabled ONLY for coding_problem
  useEffect(() => {
    if (!pageProfile.showHintsTab && activeTab === 'hints') {
      setActiveTab('chat');
    }
  }, [pageProfile.showHintsTab, activeTab]);

  // Hints State
  const [currentLevel, setCurrentLevel] = useState<HintLevel>(1);
  const [activeHint, setActiveHint] = useState<Hint | null>(null);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<ErrorStateType | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>(3);
  const [quotaKind, setQuotaKind] = useState<'per_minute' | 'per_day' | 'unknown'>('per_minute');
  const [isEstimate, setIsEstimate] = useState<boolean>(false);
  const [errorModel, setErrorModel] = useState<string | undefined>(undefined);

  // Chat State per Page
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pageMessagesMap, setPageMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Trace & Progress State
  const [traces, setTraces] = useState<AgentRunTrace[]>([]);
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [weeklySolved, setWeeklySolved] = useState<number>(0);
  const [hintsPerSolve, setHintsPerSolve] = useState<number>(0);
  const [nudgeAcceptRate, setNudgeAcceptRate] = useState<number>(0);
  const [problemsAttempted, setProblemsAttempted] = useState<number>(0);
  const [hintsViewed, setHintsViewed] = useState<number>(0);
  const [fullSolutionsViewed, setFullSolutionsViewed] = useState<number>(0);
  const [recentProblemRecords, setRecentProblemRecords] = useState<
    Array<{ id: string; title?: string; attempted: boolean; hintsViewed: number; solutionViewed: boolean; solved: boolean }>
  >([]);
  const [recentProblemHints, setRecentProblemHints] = useState<Array<{ id: string; hints: number }>>([]);
  const [diagnostics, setDiagnostics] = useState<{
    sensitivity?: 'low' | 'medium' | 'high';
    activeThresholds?: Record<string, number>;
  } | null>(null);

  // Solved Modal
  const [showSolvedModal, setShowSolvedModal] = useState<boolean>(false);

  // Settings & Send Preview Modal State
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'hint'; level: HintLevel; resolve?: () => void; reject?: (err: unknown) => void }
    | { type: 'chat'; query: string; level?: HintLevel; resolve?: () => void; reject?: (err: unknown) => void }
    | null
  >(null);
  const pendingActionRef = useRef(pendingAction);
  pendingActionRef.current = pendingAction;

  const cancelPendingAction = useCallback((reason: CancellationReason = 'USER_CANCELLED') => {
    setShowPreviewModal(false);
    const action = pendingActionRef.current;
    if (action?.reject) {
      try {
        action.reject(new CancelledError(reason));
      } catch {
        // Safe guard
      }
    }
    setPendingAction(null);
  }, []);

  const currentPageKey = useMemo(() => {
    return hashUrl(activeUrl);
  }, [activeUrl]);

  // Sync active page messages when pageKey changes
  useEffect(() => {
    if (currentPageKey) {
      const existing = pageMessagesMap.get(currentPageKey) || [];
      setMessages(existing);
    }
  }, [currentPageKey]);

  const loadHintsHistory = useCallback(async (problemHash: string) => {
    try {
      const res = await sendToBackground<{ type: string; hints: Hint[] }>({
        type: 'GET_HINTS_HISTORY',
        problemHash,
      });
      if (res?.hints && res.hints.length > 0) {
        const latest = res.hints[res.hints.length - 1]!;
        setActiveHint(latest);
        setCurrentLevel(latest.level);
      } else {
        setActiveHint(null);
        setCurrentLevel(1);
      }
    } catch {
      setActiveHint(null);
      setCurrentLevel(1);
    }
  }, []);

  const loadTelemetryAndMastery = useCallback(() => {
    sendToBackground<{ type: string; traces: AgentRunTrace[] }>({
      type: 'GET_RUN_TRACES',
    })
      .then((res) => {
        if (res?.traces) setTraces(res.traces);
      })
      .catch(() => {});

    sendToBackground<{
      type: string;
      topics: TopicProgress[];
      weeklySolved: number;
      hintsPerSolve: number;
      nudgeAcceptRate: number;
      problemsAttempted?: number;
      hintsViewed?: number;
      fullSolutionsViewed?: number;
      recentProblemRecords?: Array<{ id: string; title?: string; attempted: boolean; hintsViewed: number; solutionViewed: boolean; solved: boolean }>;
      recentProblemHints?: Array<{ id: string; hints: number }>;
    }>({ type: 'GET_MASTERY_PROGRESS' })
      .then((res) => {
        if (res) {
          setTopics(res.topics || []);
          setWeeklySolved(res.weeklySolved || 0);
          setHintsPerSolve(res.hintsPerSolve || 0);
          setNudgeAcceptRate(res.nudgeAcceptRate || 0);
          if (res.problemsAttempted !== undefined) setProblemsAttempted(res.problemsAttempted);
          if (res.hintsViewed !== undefined) setHintsViewed(res.hintsViewed);
          if (res.fullSolutionsViewed !== undefined) setFullSolutionsViewed(res.fullSolutionsViewed);
          if (res.recentProblemRecords) setRecentProblemRecords(res.recentProblemRecords);
          if (res.recentProblemHints) {
            setRecentProblemHints(res.recentProblemHints);
          }
        }
      })
      .catch(() => {});

    sendToBackground<{
      type: string;
      sensitivity?: 'low' | 'medium' | 'high';
      activeThresholds?: Record<string, number>;
    }>({ type: 'GET_NUDGE_DIAGNOSTICS' })
      .then((res) => {
        if (res) {
          setDiagnostics({
            sensitivity: res.sensitivity,
            activeThresholds: res.activeThresholds,
          });
        }
      })
      .catch(() => {});
  }, []);

  const syncActiveTabContext = useCallback(async (targetTabId?: number) => {
    if (pendingActionRef.current) {
      cancelPendingAction('TAB_SWITCHED');
    }
    setIsLoadingPage(true);
    try {
      let tabId = targetTabId;
      let url: string | undefined;
      let title: string | undefined;

      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (!tabId) {
          const parsed = parseInt(params.get('tabId') || '', 10);
          if (!isNaN(parsed) && parsed > 0) {
            tabId = parsed;
          }
        }
        if (!url) {
          const urlParam = params.get('url');
          if (urlParam) {
            url = decodeURIComponent(urlParam);
          }
        }
        if (!title) {
          const titleParam = params.get('title');
          if (titleParam) {
            title = decodeURIComponent(titleParam);
          }
        }
      }

      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        if (!tabId) {
          const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          const nonExt = activeTabs.find((t) => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'));
          if (nonExt?.id) {
            tabId = nonExt.id;
            url = nonExt.url;
            title = nonExt.title;
          } else {
            const fallbackTabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const nonExtFallback = fallbackTabs.find((t) => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'));
            if (nonExtFallback?.id) {
              tabId = nonExtFallback.id;
              url = nonExtFallback.url;
              title = nonExtFallback.title;
            } else {
              const allTabs = (await chrome.tabs.query({})).reverse();
              const sidepanelTabId = activeTabs[0]?.id;
              const candidate = allTabs.find((t) => {
                if (sidepanelTabId && t.id === sidepanelTabId) return false;
                if (t.url) {
                  return !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://');
                }
                return true; // External page with URL masked by MV3 permission model
              });
              if (candidate?.id) {
                tabId = candidate.id;
                url = candidate.url;
                title = candidate.title;
              } else if (activeTabs[0]?.id) {
                tabId = activeTabs[0].id;
                url = activeTabs[0].url;
                title = activeTabs[0].title;
              }
            }
          }
        } else {
          const tab = await chrome.tabs.get(tabId).catch(() => null);
          if (tab?.url) url = tab.url;
          if (tab?.title) title = tab.title;
        }
      }

      if (tabId) setActiveTabId(tabId);
      if (url) setActiveUrl(url);
      if (title) setActiveTabTitle(title);

      const res = await sendToBackground<{
        type: string;
        context: PageContext | null;
        signals: SignalWindow | null;
        pStuck: number;
        isContest: boolean;
        isPaused: boolean;
      }>({ type: 'GET_PROBLEM_CONTEXT', tabId });

      if (res?.context) {
        setContext(res.context);
        if (res.context.url && !url) {
          setActiveUrl(res.context.url);
        }
        if (res.context.title && !title) {
          setActiveTabTitle(res.context.title);
        }
        setSignals(res.signals);
        setPStuck(res.pStuck);
        setIsContest(res.isContest);
        setIsPaused(res.isPaused);
        loadHintsHistory(res.context.url);
      } else {
        setContext(null);
        setActiveHint(null);
      }
    } catch {
      setContext(null);
      setActiveHint(null);
    } finally {
      setIsLoadingPage(false);
    }
  }, [loadHintsHistory, cancelPendingAction]);

  // Initial Data Fetch & Tab Listeners
  useEffect(() => {
    sendToBackground<{ type: string; state: { completed?: boolean } }>({ type: 'GET_ONBOARDING' })
      .then((res) => {
        setOnboardingComplete(Boolean(res?.state?.completed));
      })
      .catch(() => setOnboardingComplete(true));

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

    syncActiveTabContext();
    loadTelemetryAndMastery();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = listenToBroadcastEvents((event) => {
      if (event.event === 'CONTEST_DETECTED') {
        setIsContest(true);
      } else if (event.event === 'NUDGE_OFFERED') {
        setPStuck(event.decision.utility);
        if (event.context) setContext(event.context);
      }
    });

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const handleActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
        syncActiveTabContext(activeInfo.tabId);
      };
      const handleUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.status === 'complete' || changeInfo.url) {
          syncActiveTabContext(tabId);
        }
      };
      const handleWindowFocus = (windowId: number) => {
        if (windowId !== chrome.windows?.WINDOW_ID_NONE) {
          syncActiveTabContext();
        }
      };

      chrome.tabs.onActivated?.addListener(handleActivated);
      chrome.tabs.onUpdated?.addListener(handleUpdated);
      chrome.windows?.onFocusChanged?.addListener(handleWindowFocus);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        unsubscribe();
        chrome.tabs.onActivated?.removeListener(handleActivated);
        chrome.tabs.onUpdated?.removeListener(handleUpdated);
        chrome.windows?.onFocusChanged?.removeListener(handleWindowFocus);
        if (pendingActionRef.current) {
          cancelPendingAction('PANEL_CLOSED');
        }
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      if (pendingActionRef.current) {
        cancelPendingAction('PANEL_CLOSED');
      }
    };
  }, [syncActiveTabContext, loadTelemetryAndMastery, cancelPendingAction]);

  const handleNextLevel = async (targetLevel: HintLevel) => {
    if (!context) return;
    if (shouldPromptSendPreview()) {
      if (pendingActionRef.current) {
        cancelPendingAction('SUPERSEDED');
      }
      setPendingAction({ type: 'hint', level: targetLevel });
      setShowPreviewModal(true);
      return;
    }
    executeRequestHint(targetLevel);
  };

  const executeRequestHint = async (targetLevel: HintLevel) => {
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
        tabId: activeTabId ?? undefined,
        pageKey: currentPageKey || undefined,
      });

      if (res?.hint) {
        setActiveHint(res.hint);
        setCurrentLevel(res.hint.level);
        loadTelemetryAndMastery();
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
      const msg = err instanceof Error ? err.message : String(err);
      const details =
        err && typeof err === 'object' && 'details' in err
          ? (err as { details: { quotaKind?: 'per_minute' | 'per_day' | 'unknown'; retryAfterSeconds?: number; retryAfterMs?: number; isEstimate?: boolean; model?: string } }).details
          : undefined;

      const qKind = details?.quotaKind || (msg.includes('per_day') || msg.includes('daily') ? 'per_day' : 'per_minute');
      const waitSec = details?.retryAfterSeconds || (details?.retryAfterMs ? Math.ceil(details.retryAfterMs / 1000) : 3);
      const estimate = Boolean(details?.isEstimate);
      const mod = details?.model || settings?.model;

      setQuotaKind(qKind);
      setRetryAfterSeconds(waitSec);
      setIsEstimate(estimate);
      setErrorModel(mod);

      if (code === 'NO_KEY' || msg.includes('NO_KEY')) {
        setErrorState('no_api_key');
      } else if (code === 'INVALID_KEY' || msg.includes('INVALID_KEY') || msg.includes('403') || msg.includes('permission_denied')) {
        setErrorState('invalid_key');
      } else if (code === 'RATE_LIMITED' || msg.includes('RATE_LIMITED') || msg.includes('429')) {
        setErrorState('rate_limited');
      } else if (code === 'OFFLINE' || msg.includes('OFFLINE')) {
        setErrorState('offline');
      } else if (code === 'TIMEOUT' || msg.includes('timed out')) {
        setErrorState('timeout');
      } else {
        setErrorState('rate_limited');
      }
    } finally {
      setIsHintLoading(false);
    }
  };

  const appendChatMessage = (msg: ChatMessage) => {
    setMessages((prev) => {
      const updated = [...prev, msg];
      if (currentPageKey) {
        setPageMessagesMap((map) => new Map(map).set(currentPageKey, updated));
      }
      return updated;
    });
  };

  const executeSendMessage = async (query: string, level?: HintLevel) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };
    appendChatMessage(userMsg);
    setIsChatLoading(true);
    setErrorState(null);

    const requestId = `chat-req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const problemHash = context?.url || `page:${currentPageKey || 'active'}`;

    try {
      const res = await sendToBackground<SubmitChatQueryResponse>({
        type: 'SUBMIT_CHAT_QUERY',
        query,
        problemHash,
        level: level ?? currentLevel,
        requestId,
        tabId: activeTabId ?? undefined,
        pageKey: currentPageKey || undefined,
        mode: pageProfile.promptVariant === 'standalone' || !context ? 'standalone' : undefined,
      });

      if (res) {
        if (res.success && res.reply) {
          const assistantMsg: ChatMessage = {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: res.reply,
            timestamp: Date.now(),
            groundedQuote: res.groundedQuote,
            confidence: res.confidence,
            codeBlock: res.codeBlock,
            criticChecked: Boolean(res.criticChecked),
            badgeStatus: res.badgeStatus,
            answerable_from_page: res.answerable_from_page,
            retrievalMode: res.retrievalMode,
            coverageStats: res.coverageStats,
            llmCallCount: res.llmCallCount,
            model: res.model,
            sectionsUsed: res.sectionsUsed,
          };
          appendChatMessage(assistantMsg);
        } else {
          const assistantMsg: ChatMessage = {
            id: `asst-err-${Date.now()}`,
            sender: 'assistant',
            text: res.reply || `I couldn't produce a verified answer based on this page (${res.errorReason || 'Grounding checks could not verify the draft'}).`,
            timestamp: Date.now(),
            isError: true,
            errorReason: res.errorReason,
            errorCode: res.errorCode,
            unverifiedDraft: res.unverifiedDraft,
            badgeStatus: res.badgeStatus || 'unverified',
            answerable_from_page: res.answerable_from_page ?? false,
            retrievalMode: res.retrievalMode,
            coverageStats: res.coverageStats,
            llmCallCount: res.llmCallCount,
            model: res.model,
          };
          appendChatMessage(assistantMsg);
        }
        loadTelemetryAndMastery();
      }
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
      const msg = err instanceof Error ? err.message : String(err);
      const details =
        err && typeof err === 'object' && 'details' in err
          ? (err as { details: { quotaKind?: 'per_minute' | 'per_day' | 'unknown'; retryAfterSeconds?: number; retryAfterMs?: number; isEstimate?: boolean; model?: string } }).details
          : undefined;

      const qKind = details?.quotaKind || (msg.includes('per_day') || msg.includes('daily') ? 'per_day' : 'per_minute');
      const waitSec = details?.retryAfterSeconds || (details?.retryAfterMs ? Math.ceil(details.retryAfterMs / 1000) : 10);
      const estimate = Boolean(details?.isEstimate);
      const mod = details?.model || settings?.model;

      setQuotaKind(qKind);
      setRetryAfterSeconds(waitSec);
      setIsEstimate(estimate);
      setErrorModel(mod);

      if (code === 'NO_KEY' || msg.includes('NO_KEY')) {
        setErrorState('no_api_key');
      } else if (code === 'INVALID_KEY' || msg.includes('INVALID_KEY') || msg.includes('403') || msg.includes('permission_denied')) {
        setErrorState('invalid_key');
      } else if (code === 'RATE_LIMITED' || msg.includes('RATE_LIMITED') || msg.includes('429')) {
        setErrorState('rate_limited');
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
        appendChatMessage(errorMsg);
      }
      throw err;
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = async (query: string, level?: HintLevel): Promise<void> => {
    if (pageProfile.kind === 'restricted') {
      const restrictedMsg: ChatMessage = {
        id: `asst-restricted-${Date.now()}`,
        sender: 'assistant',
        text: 'Browser security restricts extension access on internal browser pages (chrome://, edge://, or extension management). Please open any public web page or coding problem.',
        timestamp: Date.now(),
        isError: true,
      };
      appendChatMessage(restrictedMsg);
      return;
    }

    if (shouldPromptSendPreview()) {
      if (pendingActionRef.current) {
        cancelPendingAction('SUPERSEDED');
      }
      return new Promise<void>((resolve, reject) => {
        setPendingAction({ type: 'chat', query, level, resolve, reject });
        setShowPreviewModal(true);
      });
    }
    await executeSendMessage(query, level);
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
        setSettings((prev) => {
          if (!prev) return null;
          const neverSend =
            payload.neverSendForSite || !payload.includePageText
              ? Array.from(new Set([...(prev.neverSendPageTextSites || []), origin]))
              : (prev.neverSendPageTextSites || []).filter((s) => s !== origin);
          const confirmed = Array.from(new Set([...(prev.confirmedSendSites || []), origin]));
          return {
            ...prev,
            neverSendPageTextSites: neverSend,
            confirmedSendSites: confirmed,
          };
        });
      } catch {
        // Best-effort
      }
    }

    const action = pendingAction;
    setPendingAction(null);

    if (action?.type === 'hint') {
      executeRequestHint(action.level);
      action.resolve?.();
    } else if (action?.type === 'chat') {
      try {
        await executeSendMessage(action.query, action.level);
        action.resolve?.();
      } catch (err) {
        action.reject?.(err);
      }
    }
  };

  const handleCancelSendPreview = () => {
    cancelPendingAction('PREVIEW_CANCELLED');
  };

  const handleHighlightQuote = async (quote: string): Promise<boolean> => {
    try {
      const res = await sendToBackground<{ type: string; found: boolean; matchedLength?: number; strategyUsed?: string }>({
        type: 'HIGHLIGHT_PAGE_TEXT',
        text: quote,
        tabId: activeTabId ?? undefined,
      });
      return Boolean(res?.found);
    } catch {
      return false;
    }
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

  const handleSolved = async () => {
    if (!context) return;
    setShowSolvedModal(true);
    try {
      await sendToBackground({
        type: 'RECORD_SOLVED',
        problemHash: context.url,
        hintsUsedCount: currentLevel,
        topics: context.tags,
      });
      loadTelemetryAndMastery();
    } catch {
      // Best-effort
    }
  };

  const handleMakeMoreDirect = () => {
    const next = Math.min(4, currentLevel + 1) as HintLevel;
    handleNextLevel(next);
  };

  const handleOpenSettings = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  const getContextOrigin = (): string | null => {
    if (activeUrl) {
      try {
        return new URL(activeUrl).origin;
      } catch {
        // Fallback below
      }
    }
    if (!context?.url) return null;
    try {
      if (context.url.startsWith('http://') || context.url.startsWith('https://')) {
        return new URL(context.url).origin;
      }
      return null;
    } catch {
      return null;
    }
  };

  const shouldPromptSendPreview = (): boolean => {
    const origin = getContextOrigin();
    if (!origin) return false;
    const confirmed = settings?.confirmedSendSites?.includes(origin);
    const neverSend = settings?.neverSendPageTextSites?.includes(origin);
    if (confirmed || neverSend) return false;
    return true;
  };

  if (onboardingComplete === false) {
    return (
      <div className="flex flex-col h-screen w-full bg-background text-on-surface">
        <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />
      </div>
    );
  }

  const effectiveThreshold =
    diagnostics?.activeThresholds?.[diagnostics.sensitivity || 'medium'] ??
    (diagnostics?.sensitivity === 'high' ? 0.45 : diagnostics?.sensitivity === 'low' ? 0.75 : 0.60);

  return (
    <div className="flex flex-col h-screen w-full bg-background text-on-surface overflow-hidden">
      {/* Top Header */}
      <Header
        context={context}
        isWatching={!isPaused && isOnline && Boolean(context)}
        isPaused={isPaused}
        isContest={isContest}
        demoMode={demoMode}
        pageProfile={pageProfile}
        activeUrl={activeUrl}
        activeTabTitle={activeTabTitle}
        isLoadingPage={isLoadingPage}
        onTogglePause={handleTogglePause}
        onOpenSettings={handleOpenSettings}
      />

      {/* Main 4-Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setErrorState(null);
          setActiveTab(tab);
        }}
        showHintsTab={pageProfile.showHintsTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative" id={`tabpanel-${activeTab}`} role="tabpanel">
        {!isOnline ? (
          <ErrorStateView
            type="offline"
            onRetry={() => {
              if (navigator.onLine) setIsOnline(true);
            }}
            onOpenSettings={handleOpenSettings}
          />
        ) : !hasApiKey ? (
          <ErrorStateView
            type="no_api_key"
            onOpenSettings={handleOpenSettings}
          />
        ) : errorState ? (
          <ErrorStateView
            type={errorState}
            retryAfterSeconds={retryAfterSeconds}
            quotaKind={quotaKind}
            isEstimate={isEstimate}
            model={errorModel}
            onRetry={() => handleNextLevel(currentLevel)}
            onOpenSettings={handleOpenSettings}
            onSelectText={() => {
              setErrorState(null);
              setActiveTab('chat');
            }}
          />
        ) : isPaused && activeTab === 'hints' ? (
          <ContextualStateView type="paused" onResume={handleTogglePause} />
        ) : isContest && activeTab === 'hints' ? (
          <ContextualStateView type="contest" />
        ) : context?.isSensitive && activeTab === 'hints' ? (
          <ContextualStateView
            type="sensitive"
            sensitiveReason={context.sensitiveReason}
            onOpenChat={() => setActiveTab('chat')}
          />
        ) : context?.isSparse && activeTab === 'hints' ? (
          <ContextualStateView
            type="sparse"
            onOpenChat={() => setActiveTab('chat')}
            onSelectText={() => setActiveTab('chat')}
          />
        ) : !context && activeTab === 'hints' ? (
          <ContextualStateView
            type="no_problem"
            onOpenChat={() => setActiveTab('chat')}
            onSelectText={() => setActiveTab('chat')}
            onUseWholePage={() => setActiveTab('chat')}
          />
        ) : (
          <>
            {activeTab === 'chat' && (
              <ChatTab
                messages={messages}
                isLoading={isChatLoading}
                onSendMessage={handleSendMessage}
                onHighlightQuote={handleHighlightQuote}
                siteName={pageProfile.sourceLabel}
                contentType={context?.contentType}
                isTruncatedPage={Boolean(context?.isTruncated)}
                pageProfile={pageProfile}
              />
            )}

            {activeTab === 'hints' && pageProfile.showHintsTab && (
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
                activeThreshold={effectiveThreshold}
                sensitivity={diagnostics?.sensitivity}
                isProblem={pageProfile.kind === 'coding_problem'}
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
                problemsAttempted={problemsAttempted}
                hintsViewed={hintsViewed}
                fullSolutionsViewed={fullSolutionsViewed}
                recentProblemRecords={recentProblemRecords}
                recentProblemHints={recentProblemHints}
              />
            )}
          </>
        )}
      </main>

      {/* Solved Summary Modal */}
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
          siteOrigin={getContextOrigin() || ''}
          question={pendingAction?.type === 'chat' ? pendingAction.query : 'Initial hint request'}
          extractedText={context?.selectedText || context?.statementText || ''}
          onConfirm={handleConfirmSendPreview}
          onCancel={handleCancelSendPreview}
        />
      )}
    </div>
  );
};
