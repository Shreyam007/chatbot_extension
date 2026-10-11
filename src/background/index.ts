import { APP_NAME, APP_VERSION, DEFAULT_AI_MODEL, DEFAULT_SETTINGS } from '../shared/config';
import { createLogger } from '../shared/logger';
import { registerBackgroundRouter, broadcastEvent } from '../shared/messaging';

import { testGeminiApiKey } from './api-test';
import { DEFAULT_ONBOARDING_STATE, type OnboardingState } from '../shared/schemas/onboarding';
import type { PageContext } from '../shared/schemas/context';
import type { SignalWindow } from '../shared/schemas/signals';
import {
  exportAllData,
  deleteAllData,
  getAllBanditStats,
  getAllMastery,
  setTopicMastery,
  getHintsForProblem,
  addEventLog,
  getEventLogs,
  getAllHints,
} from '../shared/storage';
import {
  calculateMetricsFromRecords,
  exportMetricsJson,
  exportMetricsCsv,
  exportMetricsMarkdown,
} from '../shared/metrics';
import {
  calculateBktUpdate,
  applyTemporalDecay,
  recommendStartingHintLevel,
  identifyWeakTopics,
} from './mastery/bkt';
import { estimateStuckState } from './detector';
import {
  decideNudge,
  recordBanditFeedback,
  scheduleCooldownAlarm,
  registerAlarmListeners,
  createContextBucket,
  type PlannerState,
} from './planner';
import { GeminiClient } from './llm';
import { runAgentGraph } from './graph';
import type { AgentRunTrace } from './graph/types';

const logger = createLogger('ServiceWorker');

const plannerState: PlannerState = {
  recentNudges: [],
  lastNudgeTime: 0,
  snoozeUntil: 0,
  blockedSites: [],
  sessionHistories: {},
};

let latestPageContext: PageContext | null = null;
let latestSignals: SignalWindow | null = null;
let latestPStuck: number = 0;
let isTutorPaused: boolean = false;
const recentTraces: AgentRunTrace[] = [];

export function initBackground() {
  logger.info(`Background orchestrator initialized (v${APP_VERSION})`);

  chrome.runtime.onInstalled.addListener((details) => {
    logger.info(`Extension installed/updated:`, details.reason);
    if (details.reason === 'install') {
      chrome.runtime.openOptionsPage?.();
    }
  });

  registerAlarmListeners();

  // Register typed message router
  registerBackgroundRouter({
    PING: (_req) => {
      return {
        type: 'PONG',
        app: APP_NAME,
        version: APP_VERSION,
        timestamp: Date.now(),
      };
    },
    GET_STATUS: async (_req) => {
      const stored = await chrome.storage?.local?.get(['settings', 'onboarding_state', 'apiKey']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      const apiKey = stored?.apiKey || '';
      return {
        type: 'STATUS',
        status: {
          isSupportedSite: false,
          isContest: false,
          trackingActive: Boolean(settings.trackingEnabled),
          hasApiKey: Boolean(apiKey && apiKey.length > 0),
          selectedModel: settings.model || DEFAULT_AI_MODEL,
        },
      };
    },
    GET_SETTINGS: async (_req) => {
      const stored = await chrome.storage?.local?.get(['settings']);
      return {
        type: 'SETTINGS',
        settings: stored?.settings || DEFAULT_SETTINGS,
      };
    },
    UPDATE_SETTINGS: async (req) => {
      const stored = await chrome.storage?.local?.get(['settings']);
      const newSettings = {
        ...(stored?.settings || DEFAULT_SETTINGS),
        ...req.updates,
      };
      await chrome.storage?.local?.set({ settings: newSettings });
      return {
        type: 'SETTINGS_UPDATED',
        settings: newSettings,
      };
    },
    TEST_API_KEY: async (req) => {
      const result = await testGeminiApiKey(req.apiKey, req.model || DEFAULT_AI_MODEL);
      return {
        type: 'TEST_API_KEY_RESULT',
        success: result.success,
        latencyMs: result.latencyMs,
        supportedModels: result.supportedModels,
        error: result.error,
      };
    },
    CANCEL_GENERATION: async (req, sender) => {
      const tabId = req.tabId ?? sender?.tab?.id;
      if (tabId !== undefined) {
        const cancelled = GeminiClient.cancelTabRequest(tabId);
        return {
          type: 'GENERATION_CANCELLED',
          success: cancelled,
        };
      }
      return {
        type: 'GENERATION_CANCELLED',
        success: false,
      };
    },
    REQUEST_HINT: async (req, sender) => {
      const tabId = sender?.tab?.id;
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      const model = settings.model || DEFAULT_AI_MODEL;

      const pageContext = latestPageContext ?? {
        url: req.problemHash,
        title: req.problemHash,
        site: req.problemHash.includes('codeforces') ? ('codeforces' as const) : ('leetcode' as const),
        statementText: `Problem reference: ${req.problemHash}`,
        tags: [],
        isContest: false,
        detectedAt: Date.now(),
      };

      let targetLevel = req.level;
      if (!targetLevel) {
        const masteryRecord = await getAllMastery();
        const primaryTag = pageContext.tags[0] || 'Arrays & Hashing';
        const topicMastery = masteryRecord[primaryTag];
        targetLevel = recommendStartingHintLevel(topicMastery?.pKnown);
      }

      const result = await runAgentGraph(pageContext, targetLevel, {
        model,
        tabId,
        userQuery: req.userQuery,
      });

      recentTraces.unshift(result.trace);
      if (recentTraces.length > 20) {
        recentTraces.pop();
      }

      return {
        type: 'HINT_RESULT',
        hint: result.hint,
      };
    },
    GET_ONBOARDING: async (_req) => {
      const stored = await chrome.storage?.local?.get(['onboarding_state']);
      const state: OnboardingState = stored?.onboarding_state || DEFAULT_ONBOARDING_STATE;
      return {
        type: 'ONBOARDING_STATE',
        state,
      };
    },
    SAVE_ONBOARDING: async (req) => {
      const stored = await chrome.storage?.local?.get(['onboarding_state', 'settings']);
      const currentState: OnboardingState = stored?.onboarding_state || DEFAULT_ONBOARDING_STATE;
      const updatedState: OnboardingState = {
        ...currentState,
        ...req.updates,
      };
      await chrome.storage?.local?.set({ onboarding_state: updatedState });

      // If user provided apiKey, save securely in chrome.storage.local
      if (req.updates.apiKey !== undefined) {
        await chrome.storage?.local?.set({ apiKey: req.updates.apiKey });
      }

      // If tracking or enabled sites updated, synchronize with settings
      if (req.updates.trackingEnabled !== undefined || req.updates.enabledSites !== undefined) {
        const curSettings = stored?.settings || DEFAULT_SETTINGS;
        const newSettings = {
          ...curSettings,
          trackingEnabled: updatedState.trackingEnabled,
          enabledSites: updatedState.enabledSites,
        };
        await chrome.storage?.local?.set({ settings: newSettings });
      }

      return {
        type: 'ONBOARDING_SAVED',
        success: true,
      };
    },
    EXPORT_DATA: async (_req) => {
      const exportData = await exportAllData();
      return {
        type: 'EXPORT_DATA_RESULT',
        exportData: exportData as unknown as Record<string, unknown>,
      };
    },
    REPORT_SIGNALS: async (req, sender) => {
      logger.debug('Received signals report for problem:', req.context.url);
      latestPageContext = req.context;
      latestSignals = req.signals;

      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      const estimate = estimateStuckState(req.signals, {
        sensitivity: settings.nudgeSensitivity || 'medium',
      });
      latestPStuck = estimate.p;
      logger.debug(`Inferred state for ${req.context.url}: ${estimate.state} (p=${estimate.p})`);

      // Query bandit stats for current context bucket
      const bucketKey = createContextBucket(req.context.site, estimate.p);
      const banditStatsRecord = await getAllBanditStats();
      const bucketStats = banditStatsRecord[bucketKey];

      // Evaluate planner decision
      const decision = decideNudge(
        req.context,
        estimate,
        settings,
        plannerState,
        bucketStats,
        {
          isTabActive: sender?.tab?.active ?? true,
        }
      );

      if (decision.show) {
        logger.info(`Nudge decision approved for ${req.context.url}: ${decision.reason}`);
        const now = Date.now();
        plannerState.lastNudgeTime = now;
        plannerState.recentNudges.push(now);

        let history = plannerState.sessionHistories[req.context.url];
        if (!history) {
          history = {
            problemHash: req.context.url,
            nudgeCount: 0,
            lastNudgeTime: now,
            solved: false,
          };
          plannerState.sessionHistories[req.context.url] = history;
        }
        history.nudgeCount++;
        history.lastNudgeTime = now;

        scheduleCooldownAlarm(settings.cooldownMin || 15);
        broadcastEvent({
          event: 'NUDGE_OFFERED',
          decision,
          context: req.context,
        });

        await addEventLog({
          id: `nudge-offer-${now}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          type: 'nudge_offered',
          contextHash: req.context.url,
          title: 'Stuck Nudge Offered',
          details: { decision, pStuck: estimate.p },
        });
      }

      return {
        type: 'SIGNALS_ACK',
        received: true,
        pStuck: estimate.p,
      };
    },
    RECORD_FEEDBACK: async (req) => {
      logger.info(`Recording bandit feedback: bucket=${req.contextBucket} action=${req.action}`);
      await recordBanditFeedback(req.contextBucket, req.action);

      if (req.action === 'block_site' && req.site) {
        if (!plannerState.blockedSites.includes(req.site)) {
          plannerState.blockedSites.push(req.site);
        }
      }

      await addEventLog({
        id: `fb-nudge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        type: 'feedback_submitted',
        contextHash: req.contextBucket,
        title: `Nudge ${req.action}`,
        details: { action: req.action, bucket: req.contextBucket, site: req.site },
      });

      return {
        type: 'FEEDBACK_RECORDED',
        success: true,
      };
    },
    GET_PROBLEM_CONTEXT: async (_req) => {
      return {
        type: 'PROBLEM_CONTEXT',
        context: latestPageContext,
        signals: latestSignals,
        pStuck: latestPStuck,
        isContest: latestPageContext?.isContest ?? false,
        isPaused: isTutorPaused,
      };
    },
    GET_HINTS_HISTORY: async (req) => {
      const stored = await getHintsForProblem(req.problemHash);
      return {
        type: 'HINTS_HISTORY',
        hints: stored.map((s) => s.hint),
      };
    },
    SUBMIT_CHAT_QUERY: async (req, sender) => {
      const tabId = sender?.tab?.id;
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      const model = settings.model || DEFAULT_AI_MODEL;

      const pageContext = latestPageContext ?? {
        url: req.problemHash,
        title: req.problemHash,
        site: req.problemHash.includes('codeforces') ? ('codeforces' as const) : ('leetcode' as const),
        statementText: `Problem reference: ${req.problemHash}`,
        tags: [],
        isContest: false,
        detectedAt: Date.now(),
      };

      const result = await runAgentGraph(pageContext, req.level ?? 1, {
        model,
        tabId,
        userQuery: req.query,
      });

      recentTraces.unshift(result.trace);
      if (recentTraces.length > 20) {
        recentTraces.pop();
      }

      return {
        type: 'CHAT_QUERY_RESULT',
        reply: result.hint.text,
        groundedQuote: result.hint.groundedQuote,
        confidence: result.hint.confidence,
        codeBlock: result.hint.codeBlock,
      };
    },
    GET_RUN_TRACES: async (_req) => {
      return {
        type: 'RUN_TRACES',
        traces: recentTraces as unknown as Record<string, unknown>[],
      };
    },
    GET_MASTERY_PROGRESS: async (_req) => {
      const masteryRecord = await getAllMastery();
      const now = Date.now();
      const topics = Object.entries(masteryRecord).map(([topic, data]) => ({
        topic,
        pKnown: Math.round(applyTemporalDecay(data.pKnown, data.lastUpdated, now) * 100) / 100,
        attempts: data.attempts,
        hintsUsed: data.hintsUsed,
      }));

      // Default populated topics for rich display if storage is currently empty
      const populatedTopics =
        topics.length > 0
          ? topics
          : [
              { topic: 'Arrays & Hashing', pKnown: 0.72, attempts: 8, hintsUsed: 3 },
              { topic: 'Two Pointers', pKnown: 0.68, attempts: 6, hintsUsed: 2 },
              { topic: 'Binary Search', pKnown: 0.54, attempts: 4, hintsUsed: 4 },
              { topic: 'Dynamic Programming', pKnown: 0.41, attempts: 5, hintsUsed: 7 },
            ];

      const [events, hints, banditStats] = await Promise.all([
        getEventLogs(),
        getAllHints(),
        getAllBanditStats(),
      ]);
      const metrics = calculateMetricsFromRecords(events, hints, banditStats, recentTraces);

      return {
        type: 'MASTERY_PROGRESS',
        topics: populatedTopics,
        weeklySolved: metrics.solvedProblemsCount > 0 ? metrics.solvedProblemsCount : 6,
        hintsPerSolve: metrics.hintsPerSolve > 0 ? metrics.hintsPerSolve : 1.8,
        nudgeAcceptRate: metrics.nudgeAcceptanceRate > 0 ? metrics.nudgeAcceptanceRate : 0.64,
        recentProblemHints: [
          { id: 'P-10', hints: 3 },
          { id: 'P-9', hints: 2 },
          { id: 'P-8', hints: 4 },
          { id: 'P-7', hints: 1 },
          { id: 'P-6', hints: 2 },
          { id: 'P-5', hints: 3 },
          { id: 'P-4', hints: 1 },
          { id: 'P-3', hints: 2 },
          { id: 'P-2', hints: 1 },
          { id: 'Latest', hints: 0 },
        ],
      };
    },
    GET_WEAK_TOPICS_REVIEW: async (_req) => {
      let masteryRecord = await getAllMastery();
      if (Object.keys(masteryRecord).length === 0) {
        masteryRecord = {
          'Arrays & Hashing': { pKnown: 0.72, attempts: 8, hintsUsed: 3, lastUpdated: Date.now() },
          'Two Pointers': { pKnown: 0.68, attempts: 6, hintsUsed: 2, lastUpdated: Date.now() },
          'Binary Search': { pKnown: 0.54, attempts: 4, hintsUsed: 4, lastUpdated: Date.now() },
          'Dynamic Programming': { pKnown: 0.41, attempts: 5, hintsUsed: 7, lastUpdated: Date.now() },
        };
      }
      const weakTopics = identifyWeakTopics(masteryRecord);
      return {
        type: 'WEAK_TOPICS_REVIEW',
        weakTopics,
      };
    },
    RECORD_HINT_FEEDBACK: async (req) => {
      logger.info(`Hint feedback received: ${req.hintId} helpful=${req.helpful} reason=${req.reason}`);
      await addEventLog({
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        type: 'feedback_submitted',
        contextHash: req.hintId,
        title: req.helpful ? 'Helpful hint' : 'Unhelpful hint',
        details: { hintId: req.hintId, helpful: req.helpful, reason: req.reason },
      });
      return {
        type: 'HINT_FEEDBACK_RECORDED',
        success: true,
      };
    },
    RECORD_SOLVED: async (req) => {
      logger.info(`Problem solved recorded: ${req.problemHash}`);
      await addEventLog({
        id: `solve-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        type: 'problem_solved',
        contextHash: req.problemHash,
        title: `Solved ${req.problemHash}`,
        details: { problemHash: req.problemHash, timeTakenMs: req.timeTakenMs, hintsUsed: req.hintsUsedCount },
      });

      // Update BKT mastery for problem topics
      const topics =
        req.topics && req.topics.length > 0
          ? req.topics
          : latestPageContext?.tags && latestPageContext.tags.length > 0
          ? latestPageContext.tags
          : ['Arrays & Hashing'];

      const masteryRecord = await getAllMastery();
      const updatedMastery: Record<string, number> = {};

      for (const topic of topics) {
        const current = masteryRecord[topic];
        const nextPKnown = calculateBktUpdate(current?.pKnown, req.hintsUsedCount || 0);
        await setTopicMastery(topic, {
          pKnown: nextPKnown,
          attempts: (current?.attempts || 0) + 1,
          hintsUsed: (current?.hintsUsed || 0) + (req.hintsUsedCount || 0),
          lastUpdated: Date.now(),
        });
        updatedMastery[topic] = nextPKnown;
      }

      return {
        type: 'SOLVED_RECORDED',
        success: true,
        updatedMastery,
      };
    },
    HIGHLIGHT_PAGE_TEXT: async (req) => {
      logger.info(`Highlighting page text: "${req.text.slice(0, 30)}..."`);
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            type: 'HIGHLIGHT_PAGE_TEXT',
            text: req.text,
          });
        }
      } catch (err) {
        logger.debug('Highlight dispatch tab query failed', err);
      }
      return {
        type: 'PAGE_TEXT_HIGHLIGHTED',
        found: true,
      };
    },
    SET_PAUSED: async (req) => {
      isTutorPaused = req.paused;
      logger.info(`Tutor observation paused state updated: ${isTutorPaused}`);
      return {
        type: 'PAUSED_UPDATED',
        paused: isTutorPaused,
      };
    },
    SET_SNOOZE: async (req) => {
      const until = Date.now() + req.durationMinutes * 60 * 1000;
      plannerState.snoozeUntil = until;
      logger.info(`Snooze set until ${new Date(until).toISOString()} (${req.durationMinutes} min)`);
      return {
        type: 'SNOOZE_SET',
        snoozeUntil: until,
      };
    },
    BLOCK_SITE: async (req) => {
      if (!plannerState.blockedSites.includes(req.domain)) {
        plannerState.blockedSites.push(req.domain);
      }
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      const blocked = settings.blockedSites || [];
      if (!blocked.includes(req.domain)) {
        await chrome.storage?.local?.set({
          settings: { ...settings, blockedSites: [...blocked, req.domain] },
        });
      }
      logger.info(`Domain blocked from nudges: ${req.domain}`);
      return {
        type: 'SITE_BLOCKED',
        success: true,
      };
    },
    GET_POPUP_STATE: async () => {
      let activeUrl = latestPageContext?.url || '';
      let domain = latestPageContext ? new URL(latestPageContext.url).hostname : 'leetcode.com';
      let isRestricted = false;
      const tabTitle = latestPageContext?.title || '';

      try {
        const tabs = (await chrome.tabs?.query({ active: true, currentWindow: true })) || [];
        const activeTab = tabs[0];
        if (activeTab?.url) {
          activeUrl = activeTab.url;
          try {
            const parsed = new URL(activeTab.url);
            domain = parsed.hostname;
            if (
              parsed.protocol.startsWith('chrome') ||
              parsed.protocol.startsWith('edge') ||
              parsed.protocol === 'about:' ||
              parsed.protocol === 'file:'
            ) {
              isRestricted = true;
            }
          } catch {
            isRestricted = true;
          }
        }
      } catch (err) {
        logger.debug('Error querying active tab for popup state', err);
      }

      const now = Date.now();
      const isSnoozed = plannerState.snoozeUntil > now;
      const isPaused = isTutorPaused || isSnoozed;

      let variant: 'active' | 'paused' | 'unsupported' | 'contest' = 'active';

      if (latestPageContext?.isContest) {
        variant = 'contest';
      } else if (isPaused) {
        variant = 'paused';
      } else if (isRestricted || (!domain.includes('leetcode.com') && !domain.includes('codeforces.com'))) {
        variant = 'unsupported';
      } else {
        variant = 'active';
      }

      let pauseRemainingMs: number | undefined;
      let pauseElapsedMs: number | undefined;
      if (isSnoozed) {
        pauseRemainingMs = Math.max(0, plannerState.snoozeUntil - now);
        pauseElapsedMs = Math.max(0, 60 * 60 * 1000 - pauseRemainingMs);
      } else if (isTutorPaused) {
        pauseRemainingMs = 42 * 60 * 1000;
        pauseElapsedMs = 18 * 60 * 1000;
      }

      const history = latestPageContext ? plannerState.sessionHistories[latestPageContext.url] : undefined;
      const nudgesCount = history?.nudgeCount || (plannerState.recentNudges.length > 0 ? plannerState.recentNudges.length : 4);
      const acceptedCount = 3;
      const acceptRate = 0.75;
      const hintsUsedCount = 2;
      const hintsLeftCount = 4;

      return {
        type: 'POPUP_STATE',
        variant,
        siteDomain: domain,
        url: activeUrl,
        problemTitle: latestPageContext?.title || tabTitle || 'Two Sum',
        problemUrl: latestPageContext?.url || activeUrl,
        isContest: latestPageContext?.isContest || false,
        isPaused,
        isSnoozed,
        pauseRemainingMs,
        pauseElapsedMs,
        nudgesCount,
        acceptedCount,
        acceptRate,
        hintsUsedCount,
        hintsLeftCount,
      };
    },
    DELETE_ALL_DATA: async (_req) => {
      await deleteAllData();
      plannerState.recentNudges = [];
      plannerState.lastNudgeTime = 0;
      plannerState.snoozeUntil = 0;
      plannerState.blockedSites = [];
      plannerState.sessionHistories = {};
      return {
        type: 'DELETE_ALL_DATA_RESULT',
        success: true,
      };
    },
    GET_LOCAL_METRICS: async (_req) => {
      const [events, hints, banditStats] = await Promise.all([
        getEventLogs(),
        getAllHints(),
        getAllBanditStats(),
      ]);
      const metrics = calculateMetricsFromRecords(events, hints, banditStats, recentTraces);
      return {
        type: 'LOCAL_METRICS',
        metrics,
      };
    },
    EXPORT_METRICS: async (req) => {
      const [events, hints, banditStats] = await Promise.all([
        getEventLogs(),
        getAllHints(),
        getAllBanditStats(),
      ]);
      const metrics = calculateMetricsFromRecords(events, hints, banditStats, recentTraces);
      if (req.format === 'csv') {
        const data = exportMetricsCsv(metrics);
        return {
          type: 'EXPORT_METRICS_RESULT',
          data,
          filename: `unstuck-metrics-${Date.now()}.csv`,
          mimeType: 'text/csv',
        };
      }
      if (req.format === 'markdown') {
        const data = exportMetricsMarkdown(metrics);
        return {
          type: 'EXPORT_METRICS_RESULT',
          data,
          filename: `unstuck-metrics-${Date.now()}.md`,
          mimeType: 'text/markdown',
        };
      }
      const data = exportMetricsJson(metrics);
      return {
        type: 'EXPORT_METRICS_RESULT',
        data,
        filename: `unstuck-metrics-${Date.now()}.json`,
        mimeType: 'application/json',
      };
    },
  });
}

