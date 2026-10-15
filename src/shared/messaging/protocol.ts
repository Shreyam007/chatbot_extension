import { z } from 'zod';
import { SettingsSchema } from '../schemas/settings';
import { PageContextSchema } from '../schemas/context';
import { SignalWindowSchema, NudgeDecisionSchema } from '../schemas/signals';
import { HintSchema, HintLevelSchema } from '../schemas/hints';
import { OnboardingStateSchema } from '../schemas/onboarding';
import { WeakTopicRecommendationSchema } from '../schemas/mastery';
import { LocalMetricsSummarySchema } from '../metrics/types';

/**
 * Request Channels (RPC style)
 */

export const PingRequestSchema = z.object({
  type: z.literal('PING'),
});

export const PingResponseSchema = z.object({
  type: z.literal('PONG'),
  app: z.string(),
  version: z.string(),
  timestamp: z.number(),
});

export const GetStatusRequestSchema = z.object({
  type: z.literal('GET_STATUS'),
});

export const ExtensionStatusPayloadSchema = z.object({
  isSupportedSite: z.boolean(),
  isContest: z.boolean(),
  trackingActive: z.boolean(),
  hasApiKey: z.boolean(),
  selectedModel: z.string(),
  activeTabUrl: z.string().optional(),
});

export const GetStatusResponseSchema = z.object({
  type: z.literal('STATUS'),
  status: ExtensionStatusPayloadSchema,
});

export const GetSettingsRequestSchema = z.object({
  type: z.literal('GET_SETTINGS'),
});

export const GetSettingsResponseSchema = z.object({
  type: z.literal('SETTINGS'),
  settings: SettingsSchema,
});

export const UpdateSettingsRequestSchema = z.object({
  type: z.literal('UPDATE_SETTINGS'),
  updates: SettingsSchema.partial(),
});

export const UpdateSettingsResponseSchema = z.object({
  type: z.literal('SETTINGS_UPDATED'),
  settings: SettingsSchema,
});

export const ReportSignalsRequestSchema = z.object({
  type: z.literal('REPORT_SIGNALS'),
  signals: SignalWindowSchema,
  context: PageContextSchema,
});

export const ReportSignalsResponseSchema = z.object({
  type: z.literal('SIGNALS_ACK'),
  received: z.boolean(),
  pStuck: z.number().min(0).max(1).optional(),
});

export const RequestHintRequestSchema = z.object({
  type: z.literal('REQUEST_HINT'),
  level: HintLevelSchema,
  problemHash: z.string().min(1),
  userQuery: z.string().max(2000).optional(),
  requestId: z.string().optional(),
});

export const RequestHintResponseSchema = z.object({
  type: z.literal('HINT_RESULT'),
  hint: HintSchema,
});

export const TestApiKeyRequestSchema = z.object({
  type: z.literal('TEST_API_KEY'),
  apiKey: z.string().min(1),
  model: z.string().optional(),
});

export const TestApiKeyResponseSchema = z.object({
  type: z.literal('TEST_API_KEY_RESULT'),
  success: z.boolean(),
  latencyMs: z.number().optional(),
  supportedModels: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export const GetOnboardingRequestSchema = z.object({
  type: z.literal('GET_ONBOARDING'),
});

export const GetOnboardingResponseSchema = z.object({
  type: z.literal('ONBOARDING_STATE'),
  state: OnboardingStateSchema,
});

export const SaveOnboardingRequestSchema = z.object({
  type: z.literal('SAVE_ONBOARDING'),
  updates: z.record(z.string(), z.unknown()),
});

export const SaveOnboardingResponseSchema = z.object({
  type: z.literal('ONBOARDING_SAVED'),
  success: z.boolean(),
});

export const ExportDataRequestSchema = z.object({
  type: z.literal('EXPORT_DATA'),
});

export const ExportDataResponseSchema = z.object({
  type: z.literal('EXPORT_DATA_RESULT'),
  exportData: z.record(z.string(), z.unknown()),
});

export const DeleteAllDataRequestSchema = z.object({
  type: z.literal('DELETE_ALL_DATA'),
});

export const DeleteAllDataResponseSchema = z.object({
  type: z.literal('DELETE_ALL_DATA_RESULT'),
  success: z.literal(true),
});

export const RecordFeedbackRequestSchema = z.object({
  type: z.literal('RECORD_FEEDBACK'),
  contextBucket: z.string(),
  action: z.enum(['accept', 'dismiss', 'ignore', 'block_site']),
  site: z.string().optional(),
});

export const RecordFeedbackResponseSchema = z.object({
  type: z.literal('FEEDBACK_RECORDED'),
  success: z.boolean(),
});

export const CancelGenerationRequestSchema = z.object({
  type: z.literal('CANCEL_GENERATION'),
  tabId: z.number().optional(),
  requestId: z.string().optional(),
});

export const CancelGenerationResponseSchema = z.object({
  type: z.literal('GENERATION_CANCELLED'),
  success: z.boolean(),
});

export const GetProblemContextRequestSchema = z.object({
  type: z.literal('GET_PROBLEM_CONTEXT'),
  tabId: z.number().optional(),
});

export const GetProblemContextResponseSchema = z.object({
  type: z.literal('PROBLEM_CONTEXT'),
  context: PageContextSchema.nullable(),
  signals: SignalWindowSchema.nullable(),
  pStuck: z.number().min(0).max(1),
  isContest: z.boolean(),
  isPaused: z.boolean(),
  error: z.string().optional(),
});

export const GetHintsHistoryRequestSchema = z.object({
  type: z.literal('GET_HINTS_HISTORY'),
  problemHash: z.string().min(1),
});

export const GetHintsHistoryResponseSchema = z.object({
  type: z.literal('HINTS_HISTORY'),
  hints: z.array(HintSchema),
});

export const SubmitChatQueryRequestSchema = z.object({
  type: z.literal('SUBMIT_CHAT_QUERY'),
  query: z.string().min(1).max(2000),
  problemHash: z.string().min(1),
  level: HintLevelSchema.optional(),
  requestId: z.string().optional(),
  mode: z.enum(['page', 'standalone', 'no_page']).optional(),
});

export const SubmitChatQueryResponseSchema = z.object({
  type: z.literal('CHAT_QUERY_RESULT'),
  reply: z.string(),
  groundedQuote: z.string().optional(),
  confidence: z.number().min(0).max(1),
  codeBlock: z.string().optional(),
  criticChecked: z.boolean().optional(),
  answerable_from_page: z.boolean().optional(),
});

export const GetRunTracesRequestSchema = z.object({
  type: z.literal('GET_RUN_TRACES'),
  problemHash: z.string().optional(),
});

export const GetRunTracesResponseSchema = z.object({
  type: z.literal('RUN_TRACES'),
  traces: z.array(z.record(z.string(), z.unknown())),
});

export const GetMasteryProgressRequestSchema = z.object({
  type: z.literal('GET_MASTERY_PROGRESS'),
});

export const GetMasteryProgressResponseSchema = z.object({
  type: z.literal('MASTERY_PROGRESS'),
  topics: z.array(
    z.object({
      topic: z.string(),
      pKnown: z.number().min(0).max(1),
      attempts: z.number(),
      hintsUsed: z.number(),
    })
  ),
  weeklySolved: z.number(),
  hintsPerSolve: z.number(),
  nudgeAcceptRate: z.number().min(0).max(1),
  recentProblemHints: z.array(
    z.object({
      id: z.string(),
      hints: z.number(),
    })
  ),
});

export const RecordHintFeedbackRequestSchema = z.object({
  type: z.literal('RECORD_HINT_FEEDBACK'),
  hintId: z.string().min(1),
  helpful: z.boolean(),
  reason: z.string().optional(),
});

export const RecordHintFeedbackResponseSchema = z.object({
  type: z.literal('HINT_FEEDBACK_RECORDED'),
  success: z.boolean(),
});

export const RecordSolvedRequestSchema = z.object({
  type: z.literal('RECORD_SOLVED'),
  problemHash: z.string().min(1),
  timeTakenMs: z.number().optional(),
  hintsUsedCount: z.number().optional(),
  topics: z.array(z.string()).optional(),
});

export const RecordSolvedResponseSchema = z.object({
  type: z.literal('SOLVED_RECORDED'),
  success: z.boolean(),
  updatedMastery: z.record(z.string(), z.number()).optional(),
});

export const GetWeakTopicsReviewRequestSchema = z.object({
  type: z.literal('GET_WEAK_TOPICS_REVIEW'),
});

export const GetWeakTopicsReviewResponseSchema = z.object({
  type: z.literal('WEAK_TOPICS_REVIEW'),
  weakTopics: z.array(WeakTopicRecommendationSchema),
});

export const HighlightPageTextRequestSchema = z.object({
  type: z.literal('HIGHLIGHT_PAGE_TEXT'),
  text: z.string().min(1),
});

export const HighlightPageTextResponseSchema = z.object({
  type: z.literal('PAGE_TEXT_HIGHLIGHTED'),
  found: z.boolean(),
});

export const SetPausedRequestSchema = z.object({
  type: z.literal('SET_PAUSED'),
  paused: z.boolean(),
  durationMinutes: z.number().optional(),
});

export const SetPausedResponseSchema = z.object({
  type: z.literal('PAUSED_UPDATED'),
  paused: z.boolean(),
});

export const SetSnoozeRequestSchema = z.object({
  type: z.literal('SET_SNOOZE'),
  durationMinutes: z.number().min(1),
});

export const SetSnoozeResponseSchema = z.object({
  type: z.literal('SNOOZE_SET'),
  snoozeUntil: z.number(),
});

export const BlockSiteRequestSchema = z.object({
  type: z.literal('BLOCK_SITE'),
  domain: z.string().min(1),
});

export const BlockSiteResponseSchema = z.object({
  type: z.literal('SITE_BLOCKED'),
  success: z.boolean(),
});

export const PopupVariantSchema = z.enum(['active', 'paused', 'unsupported', 'contest']);
export type PopupVariant = z.infer<typeof PopupVariantSchema>;

export const EnableSiteOnceRequestSchema = z.object({
  type: z.literal('ENABLE_SITE_ONCE'),
  tabId: z.number().optional(),
});

export const EnableSiteOnceResponseSchema = z.object({
  type: z.literal('SITE_ENABLED_ONCE'),
  success: z.boolean(),
  context: PageContextSchema.nullable().optional(),
});

export const AlwaysAllowOriginRequestSchema = z.object({
  type: z.literal('ALWAYS_ALLOW_ORIGIN'),
  origin: z.string(),
  tabId: z.number().optional(),
});

export const AlwaysAllowOriginResponseSchema = z.object({
  type: z.literal('ORIGIN_ALLOWED'),
  success: z.boolean(),
});

export const RevokeOriginRequestSchema = z.object({
  type: z.literal('REVOKE_ORIGIN'),
  origin: z.string(),
});

export const RevokeOriginResponseSchema = z.object({
  type: z.literal('ORIGIN_REVOKED'),
  success: z.boolean(),
});

export const ToggleOriginPauseRequestSchema = z.object({
  type: z.literal('TOGGLE_ORIGIN_PAUSE'),
  origin: z.string(),
  paused: z.boolean(),
});

export const ToggleOriginPauseResponseSchema = z.object({
  type: z.literal('ORIGIN_PAUSE_UPDATED'),
  success: z.boolean(),
});

export const UpdateSitePrivacyRequestSchema = z.object({
  type: z.literal('UPDATE_SITE_PRIVACY'),
  origin: z.string(),
  neverSendPageText: z.boolean().optional(),
  neverNudge: z.boolean().optional(),
  confirmed: z.boolean().optional(),
});

export const UpdateSitePrivacyResponseSchema = z.object({
  type: z.literal('SITE_PRIVACY_UPDATED'),
  success: z.boolean(),
});

export const OpenSidePanelRequestSchema = z.object({
  type: z.literal('OPEN_SIDE_PANEL'),
  tabId: z.number().optional(),
});

export const OpenSidePanelResponseSchema = z.object({
  type: z.literal('SIDE_PANEL_OPENED'),
  success: z.boolean(),
  fallback: z.boolean().optional(),
  error: z.string().optional(),
});

export const NudgeDecisionRecordSchema = z.object({
  timestamp: z.number(),
  tabId: z.number().optional(),
  site: z.string(),
  state: z.string(),
  pStuck: z.number(),
  features: z.object({
    activeDwellMinutes: z.number(),
    wrongSubmissions: z.number(),
    scrollReversals: z.number(),
    tabSwitchRate: z.number(),
    idleRatio: z.number(),
  }),
  gateBlockedReason: z.string(),
  banditAction: z.string(),
  signalsArrived: z.boolean(),
  lastSignalAgeSec: z.number(),
  timeWithoutProgressMin: z.number().optional(),
});
export type NudgeDecisionRecord = z.infer<typeof NudgeDecisionRecordSchema>;

export const GetNudgeDiagnosticsRequestSchema = z.object({
  type: z.literal('GET_NUDGE_DIAGNOSTICS'),
  tabId: z.number().optional(),
});

export const GetNudgeDiagnosticsResponseSchema = z.object({
  type: z.literal('NUDGE_DIAGNOSTICS'),
  latestDecision: NudgeDecisionRecordSchema.nullable(),
  recentDecisions: z.array(NudgeDecisionRecordSchema),
  activeThresholds: z.record(z.string(), z.number()),
  sensitivity: z.string(),
  nudgeAfterMinutes: z.number(),
  whyNoNudgeReason: z.string(),
  lastSignalAgeSec: z.number().nullable(),
});

export const GetPopupStateRequestSchema = z.object({
  type: z.literal('GET_POPUP_STATE'),
});

export const GetPopupStateResponseSchema = z.object({
  type: z.literal('POPUP_STATE'),
  variant: PopupVariantSchema,
  siteDomain: z.string(),
  url: z.string(),
  problemTitle: z.string().optional(),
  problemUrl: z.string().optional(),
  isContest: z.boolean(),
  isPaused: z.boolean(),
  isSnoozed: z.boolean(),
  pauseRemainingMs: z.number().optional(),
  pauseElapsedMs: z.number().optional(),
  nudgesCount: z.number(),
  acceptedCount: z.number(),
  acceptRate: z.number(),
  hintsUsedCount: z.number(),
  hintsLeftCount: z.number().optional(),
  selectedModel: z.string().optional(),
  demoMode: z.boolean().optional(),
  isRestrictedScheme: z.boolean().optional(),
  canEnable: z.boolean().optional(),
  isAllowedSite: z.boolean().optional(),
  isSingleUseActive: z.boolean().optional(),
  contentType: z.string().optional(),
  whyNoNudgeReason: z.string().optional(),
});

export const GetLocalMetricsRequestSchema = z.object({
  type: z.literal('GET_LOCAL_METRICS'),
});

export const GetLocalMetricsResponseSchema = z.object({
  type: z.literal('LOCAL_METRICS'),
  metrics: LocalMetricsSummarySchema,
});

export const ExportMetricsRequestSchema = z.object({
  type: z.literal('EXPORT_METRICS'),
  format: z.enum(['json', 'csv', 'markdown']),
});

export const ExportMetricsResponseSchema = z.object({
  type: z.literal('EXPORT_METRICS_RESULT'),
  data: z.string(),
  filename: z.string(),
  mimeType: z.string(),
});

/**
 * Union of all valid requests
 */
export const BusRequestSchema = z.discriminatedUnion('type', [
  PingRequestSchema,
  GetStatusRequestSchema,
  GetSettingsRequestSchema,
  UpdateSettingsRequestSchema,
  ReportSignalsRequestSchema,
  RequestHintRequestSchema,
  CancelGenerationRequestSchema,
  TestApiKeyRequestSchema,
  GetOnboardingRequestSchema,
  SaveOnboardingRequestSchema,
  ExportDataRequestSchema,
  DeleteAllDataRequestSchema,
  RecordFeedbackRequestSchema,
  GetProblemContextRequestSchema,
  GetHintsHistoryRequestSchema,
  SubmitChatQueryRequestSchema,
  GetRunTracesRequestSchema,
  GetMasteryProgressRequestSchema,
  RecordHintFeedbackRequestSchema,
  RecordSolvedRequestSchema,
  HighlightPageTextRequestSchema,
  SetPausedRequestSchema,
  SetSnoozeRequestSchema,
  BlockSiteRequestSchema,
  GetPopupStateRequestSchema,
  GetWeakTopicsReviewRequestSchema,
  GetLocalMetricsRequestSchema,
  ExportMetricsRequestSchema,
  EnableSiteOnceRequestSchema,
  AlwaysAllowOriginRequestSchema,
  RevokeOriginRequestSchema,
  ToggleOriginPauseRequestSchema,
  UpdateSitePrivacyRequestSchema,
  OpenSidePanelRequestSchema,
  GetNudgeDiagnosticsRequestSchema,
]);

/**
 * Standard Envelope Response
 */
export const BusErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export const BusResponseEnvelopeSchema = z.union([
  z.object({
    ok: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    ok: z.literal(false),
    error: BusErrorSchema,
  }),
]);

/**
 * Broadcast Event Channels
 */
export const NudgeOfferedEventSchema = z.object({
  event: z.literal('NUDGE_OFFERED'),
  decision: NudgeDecisionSchema,
  context: PageContextSchema,
});

export const StateChangedEventSchema = z.object({
  event: z.literal('STATE_CHANGED'),
  status: ExtensionStatusPayloadSchema,
});

export const ContestDetectedEventSchema = z.object({
  event: z.literal('CONTEST_DETECTED'),
  url: z.string(),
});

export const BusBroadcastEventSchema = z.discriminatedUnion('event', [
  NudgeOfferedEventSchema,
  StateChangedEventSchema,
  ContestDetectedEventSchema,
]);

export type BusRequest = z.infer<typeof BusRequestSchema>;
export type BusResponseEnvelope = z.infer<typeof BusResponseEnvelopeSchema>;
export type BusBroadcastEvent = z.infer<typeof BusBroadcastEventSchema>;
export type BusError = z.infer<typeof BusErrorSchema>;
