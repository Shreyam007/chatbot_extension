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
import {
  executeScriptOnTabOnce,
  registerOriginContentScript,
  unregisterOriginContentScript,
  removeSitePermission,
  normalizeOriginPattern,
  extractOriginFromUrl,
} from '../shared/permissions';

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
const singleUseTabs = new Set<number>();

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
          isSupportedSite: Boolean(latestPageContext && latestPageContext.site !== 'generic'),
          isContest: Boolean(latestPageContext?.isContest),
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
      const cancelled = GeminiClient.cancelRequest({
        requestId: req.requestId,
        tabId,
      });
      return {
        type: 'GENERATION_CANCELLED',
        success: cancelled,
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
        requestId: req.requestId,
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
          demoMode: Boolean(settings.demoMode),
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
      let context = latestPageContext;
      if (!context && typeof chrome !== 'undefined' && chrome.tabs?.query) {
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id && activeTab.url) {
            // Try querying the active tab content script directly
            const tabRes = await new Promise<{ ok: boolean; context: PageContext | null }>((resolve) => {
              chrome.tabs.sendMessage(activeTab.id!, { type: 'GET_PAGE_CONTEXT' }, (res) => {
                if (chrome.runtime?.lastError || !res) {
                  resolve({ ok: false, context: null });
                } else {
                  resolve(res);
                }
              });
            });
            if (tabRes?.context) {
              context = tabRes.context;
              latestPageContext = context;
            } else if (activeTab.url.includes('leetcode.com/problems/')) {
              // Construct immediate valid context from URL slug
              const slugMatch = activeTab.url.match(/\/problems\/([^/]+)/);
              const slug = slugMatch ? slugMatch[1] : '';
              if (slug) {
                const formattedTitle = slug
                  .split('-')
                  .filter(Boolean)
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
                const isContest = activeTab.url.includes('/contest/');
                context = {
                  url: `leetcode:${slug.toLowerCase()}`,
                  site: 'leetcode',
                  title: formattedTitle,
                  statementText: `Problem: ${formattedTitle} (LeetCode).`,
                  tags: [],
                  isContest,
                  detectedAt: Date.now(),
                };
                latestPageContext = context;
              }
            }
          }
        } catch (err) {
          logger.debug('Active tab context lookup error:', err);
        }
      }

      return {
        type: 'PROBLEM_CONTEXT',
        context,
        signals: latestSignals,
        pStuck: latestPStuck,
        isContest: context?.isContest ?? false,
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
        requestId: req.requestId,
      });

      recentTraces.unshift(result.trace);
      if (recentTraces.length > 20) {
        recentTraces.pop();
      }

      const criticEval = result.trace.criticEvaluations[0];
      const isCriticApproved = Boolean(
        result.hint.checks?.leak === false &&
        result.hint.checks?.grounded === true &&
        !result.trace.isFallback
      );

      return {
        type: 'CHAT_QUERY_RESULT',
        reply: result.hint.text,
        groundedQuote: result.hint.groundedQuote,
        confidence: result.hint.confidence,
        codeBlock: result.hint.codeBlock,
        criticChecked: isCriticApproved,
        answerable_from_page: (criticEval as unknown as { answerable_from_page?: boolean })?.answerable_from_page ?? true,
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

      const [events, hints, banditStats] = await Promise.all([
        getEventLogs(),
        getAllHints(),
        getAllBanditStats(),
      ]);
      const metrics = calculateMetricsFromRecords(events, hints, banditStats, recentTraces);

      return {
        type: 'MASTERY_PROGRESS',
        topics,
        weeklySolved: metrics.solvedProblemsCount,
        hintsPerSolve: metrics.hintsPerSolve,
        nudgeAcceptRate: metrics.nudgeAcceptanceRate,
        recentProblemHints: [],
      };
    },
    GET_WEAK_TOPICS_REVIEW: async (_req) => {
      const masteryRecord = await getAllMastery();
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
      const isArticleOrDoc = latestPageContext?.contentType && latestPageContext.contentType !== 'problem';
      const topics =
        req.topics && req.topics.length > 0
          ? req.topics
          : latestPageContext?.tags && latestPageContext.tags.length > 0
          ? latestPageContext.tags
          : isArticleOrDoc
          ? [] // Skip updating mastery for generic articles with no clear programming topics
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
    ENABLE_SITE_ONCE: async (req, sender) => {
      let tabId = req.tabId ?? sender?.tab?.id;
      if (!tabId) {
        const [activeTab] = (await chrome.tabs?.query({ active: true, currentWindow: true })) || [];
        tabId = activeTab?.id;
      }
      if (!tabId) {
        return { type: 'SITE_ENABLED_ONCE', success: false };
      }
      singleUseTabs.add(tabId);
      const success = await executeScriptOnTabOnce(tabId);

      // Attempt immediate context fetch from newly injected tab
      if (success) {
        try {
          const resp = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTEXT' });
          if (resp?.context) {
            latestPageContext = resp.context;
          }
        } catch {
          // May take a tick to mount
        }
      }

      return {
        type: 'SITE_ENABLED_ONCE',
        success,
        context: latestPageContext,
      };
    },
    ALWAYS_ALLOW_ORIGIN: async (req) => {
      const originPattern = normalizeOriginPattern(req.origin);
      const originBase = extractOriginFromUrl(req.origin);

      const registered = await registerOriginContentScript(originPattern);
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;

      const currentAllowed = settings.allowedOrigins || [];
      const exists = currentAllowed.some((item: { origin: string }) => item.origin === originPattern || item.origin === originBase);
      const updatedAllowed = exists
        ? currentAllowed.map((item: { origin: string }) =>
            item.origin === originPattern || item.origin === originBase ? { ...item, status: 'active' } : item
          )
        : [...currentAllowed, { origin: originBase, grantedAt: Date.now(), status: 'active', enabledNudges: false }];

      const enabledSites = settings.enabledSites || ['leetcode.com', 'codeforces.com'];
      const newEnabledSites = enabledSites.includes(originBase) ? enabledSites : [...enabledSites, originBase];

      await chrome.storage?.local?.set({
        settings: {
          ...settings,
          allowedOrigins: updatedAllowed,
          enabledSites: newEnabledSites,
        },
      });

      if (req.tabId) {
        singleUseTabs.add(req.tabId);
        await executeScriptOnTabOnce(req.tabId);
      }

      return {
        type: 'ORIGIN_ALLOWED',
        success: registered,
      };
    },
    REVOKE_ORIGIN: async (req) => {
      const originPattern = normalizeOriginPattern(req.origin);
      const originBase = extractOriginFromUrl(req.origin);

      await unregisterOriginContentScript(originPattern);
      await removeSitePermission(originPattern);

      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;

      const currentAllowed = settings.allowedOrigins || [];
      const updatedAllowed = currentAllowed.filter(
        (item: { origin: string }) => item.origin !== originPattern && item.origin !== originBase && item.origin !== req.origin
      );
      const enabledSites = (settings.enabledSites || ['leetcode.com', 'codeforces.com']).filter(
        (s: string) => !req.origin.includes(s) && !s.includes(req.origin)
      );

      await chrome.storage?.local?.set({
        settings: {
          ...settings,
          allowedOrigins: updatedAllowed,
          enabledSites,
        },
      });

      return {
        type: 'ORIGIN_REVOKED',
        success: true,
      };
    },
    TOGGLE_ORIGIN_PAUSE: async (req) => {
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      const currentAllowed = settings.allowedOrigins || [];

      const updatedAllowed = currentAllowed.map((item: { origin: string }) => {
        if (item.origin === req.origin || normalizeOriginPattern(item.origin) === normalizeOriginPattern(req.origin)) {
          return { ...item, status: req.paused ? 'paused' : 'active' };
        }
        return item;
      });

      await chrome.storage?.local?.set({
        settings: {
          ...settings,
          allowedOrigins: updatedAllowed,
        },
      });

      return {
        type: 'ORIGIN_PAUSE_UPDATED',
        success: true,
      };
    },
    UPDATE_SITE_PRIVACY: async (req) => {
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;

      let neverSend = settings.neverSendPageTextSites || [];
      if (req.neverSendPageText !== undefined) {
        neverSend = req.neverSendPageText
          ? Array.from(new Set([...neverSend, req.origin]))
          : neverSend.filter((s: string) => s !== req.origin);
      }

      let neverNudge = settings.neverNudgeSites || [];
      if (req.neverNudge !== undefined) {
        neverNudge = req.neverNudge
          ? Array.from(new Set([...neverNudge, req.origin]))
          : neverNudge.filter((s: string) => s !== req.origin);
      }

      let confirmed = settings.confirmedSendSites || [];
      if (req.confirmed !== undefined) {
        confirmed = req.confirmed
          ? Array.from(new Set([...confirmed, req.origin]))
          : confirmed.filter((s: string) => s !== req.origin);
      }

      await chrome.storage?.local?.set({
        settings: {
          ...settings,
          neverSendPageTextSites: neverSend,
          neverNudgeSites: neverNudge,
          confirmedSendSites: confirmed,
        },
      });

      return {
        type: 'SITE_PRIVACY_UPDATED',
        success: true,
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
      const stored = await chrome.storage?.local?.get(['settings']);
      const settings = stored?.settings || DEFAULT_SETTINGS;
      let activeUrl = latestPageContext?.url || '';
      let domain = latestPageContext ? new URL(latestPageContext.url).hostname : 'leetcode.com';
      let isRestricted = false;
      let activeTabId: number | undefined;
      const tabTitle = latestPageContext?.title || '';

      try {
        const tabs = (await chrome.tabs?.query({ active: true, currentWindow: true })) || [];
        const activeTab = tabs[0];
        if (activeTab?.id) {
          activeTabId = activeTab.id;
        }
        if (activeTab?.url) {
          activeUrl = activeTab.url;
          try {
            const parsed = new URL(activeTab.url);
            domain = parsed.hostname;
            if (
              parsed.protocol.startsWith('chrome') ||
              parsed.protocol.startsWith('edge') ||
              parsed.protocol === 'about:' ||
              parsed.protocol.startsWith('chrome-extension') ||
              parsed.protocol.startsWith('devtools') ||
              activeTab.url.includes('chromewebstore.google.com') ||
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

      const isSingleUseActive = Boolean(activeTabId && singleUseTabs.has(activeTabId));
      const isBuiltinCodingSite = domain.includes('leetcode.com') || domain.includes('codeforces.com');
      const isAllowedInSettings = (settings.allowedOrigins || []).some(
        (ao: { origin: string; status: string }) => ao.status === 'active' && (domain.includes(ao.origin) || ao.origin.includes(domain))
      ) || (settings.enabledSites || []).some((s: string) => domain.includes(s) || s.includes(domain));

      const isAllowedSite = isBuiltinCodingSite || isAllowedInSettings || isSingleUseActive;
      const canEnable = !isRestricted && !isAllowedSite;

      let variant: 'active' | 'paused' | 'unsupported' | 'contest' = 'active';

      if (latestPageContext?.isContest) {
        variant = 'contest';
      } else if (isPaused) {
        variant = 'paused';
      } else if (isRestricted || !isAllowedSite) {
        variant = 'unsupported';
      } else {
        variant = 'active';
      }

      let pauseRemainingMs: number | undefined;
      let pauseElapsedMs: number | undefined;
      if (isSnoozed) {
        pauseRemainingMs = Math.max(0, plannerState.snoozeUntil - now);
        pauseElapsedMs = Math.max(0, 60 * 60 * 1000 - pauseRemainingMs);
      }

      // Read real metrics from the shared calculator (same source as Progress & Options)
      const [events, hints, banditStats] = await Promise.all([
        getEventLogs(),
        getAllHints(),
        getAllBanditStats(),
      ]);
      const metrics = calculateMetricsFromRecords(events, hints, banditStats, recentTraces);

      const nudgesCount = metrics.nudgesOffered;
      const acceptedCount = metrics.nudgesAccepted;
      const acceptRate = metrics.nudgeAcceptanceRate;
      const hintsUsedCount = metrics.totalHintsDelivered;

      // Clean problemTitle: never hardcode 'Two Sum'
      let cleanProblemTitle = latestPageContext?.title;
      if (!cleanProblemTitle && tabTitle && !tabTitle.includes('LeetCode')) {
        cleanProblemTitle = tabTitle;
      }

      return {
        type: 'POPUP_STATE',
        variant,
        siteDomain: domain,
        url: activeUrl,
        problemTitle: cleanProblemTitle,
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
        selectedModel: settings.model || DEFAULT_AI_MODEL,
        demoMode: Boolean(settings.demoMode),
        isRestrictedScheme: isRestricted,
        canEnable,
        isAllowedSite,
        isSingleUseActive,
        contentType: latestPageContext?.contentType || 'article',
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

