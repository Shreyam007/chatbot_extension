import { LIMITS } from '../../shared/config';
import { createLogger } from '../../shared/logger';
import { saveHintRecord, addEventLog } from '../../shared/storage';
import { buildContext } from './context-builder';
import { generateHint } from './generator';
import { evaluateHint } from './critic';
import { generateSafeFallback } from './fallback';
import { LlmError } from '../llm/errors';
import type {
  AgentGraphState,
  AgentGraphOptions,
  AgentRunTrace,
  TraceNodeTiming,
  GeneratedHintCandidate,
} from './types';
import type { PageContext } from '../../shared/schemas/context';
import type { Hint, HintLevel } from '../../shared/schemas/hints';

const logger = createLogger('AgentGraph');

/**
 * Executes the canonical multi-agent StateGraph:
 * context_builder -> hint_generator -> critic -> [deliver | retry -> hint_generator | safe_fallback -> deliver]
 */
export async function runAgentGraph(
  context: PageContext,
  level: HintLevel,
  options: AgentGraphOptions = {}
): Promise<{ hint: Hint; trace: AgentRunTrace; candidateHint?: GeneratedHintCandidate }> {
  const startTime = Date.now();
  // Chat queries cap retries to 1 for interactive responsiveness; hints allow configured retries (default 2)
  const maxRetries = options.maxRetries ?? (options.userQuery ? 1 : LIMITS.MAX_CRITIC_RETRIES);
  const timeoutMs = options.timeoutMs ?? 30000;
  const deadlineMs = startTime + timeoutMs;
  const isLowQuota = options.lowQuotaMode ?? false;
  const MAX_TOTAL_LLM_CALLS = options.maxRetries !== undefined
    ? (options.maxRetries + 1) * (isLowQuota ? 1 : 2)
    : (isLowQuota ? 2 : 4);
  let totalLlmCalls = 0;
  const problemHash = context.url;

  const trace: AgentRunTrace = {
    id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    problemHash,
    requestedLevel: level,
    startTime,
    totalDurationMs: 0,
    nodeTimings: [],
    retries: 0,
    criticEvaluations: [],
    isFallback: false,
    model: options.model || 'gemini-2.5-flash',
  };

  const state: AgentGraphState = {
    context,
    level,
    mastery: options.mastery,
    history: options.history,
    userCode: options.userCode,
    userQuery: options.userQuery,
    retryCount: 0,
    trace,
  };

  function recordNodeTiming(node: string, nodeStart: number, details?: Record<string, unknown>) {
    const timing: TraceNodeTiming = {
      node,
      startTime: nodeStart,
      durationMs: Math.max(1, Date.now() - nodeStart),
      details,
    };
    trace.nodeTimings.push(timing);
  }

  // Record initial telemetry pipeline stages for XAI transparency
  const siteName = context.site || 'leetcode';
  recordNodeTiming('detector', startTime, { triggered: true });
  recordNodeTiming('planner', startTime, {
    selectedAction: `nudge_with_level_${level}`,
    bucket: `${siteName}:high:intermediate`,
  });

  // --- NODE 1: context_builder ---
  const cbStart = Date.now();
  state.assembledPrompt = buildContext(state);
  recordNodeTiming('context_builder', cbStart, {
    statementLength: context.statementText?.length || 0,
    hasUserCode: Boolean(state.userCode),
  });

  // --- GENERATION & CRITIC RETRY LOOP ---
  let deliveredHint: Hint | undefined;

  while (state.retryCount <= maxRetries) {
    if (Date.now() >= deadlineMs || totalLlmCalls >= MAX_TOTAL_LLM_CALLS) {
      logger.warn(
        `Budget or deadline reached (calls=${totalLlmCalls}/${MAX_TOTAL_LLM_CALLS}, elapsed=${Date.now() - startTime}ms); falling back`
      );
      break;
    }

    // NODE 2: hint_generator
    const genStart = Date.now();
    logger.debug(`Executing hint_generator (attempt ${state.retryCount + 1}/${maxRetries + 1})`);
    totalLlmCalls++;

    try {
      state.candidateHint = await generateHint(state, {
        model: options.model,
        tabId: options.tabId,
        apiKey: options.apiKey,
        requestId: options.requestId,
      });
      recordNodeTiming('hint_generator', genStart, {
        attempt: state.retryCount + 1,
        selfConfidence: state.candidateHint.selfConfidence,
      });
    } catch (genErr) {
      logger.operationalError('hint_generator execution failed', genErr);
      recordNodeTiming('hint_generator', genStart, { error: String(genErr) });
      const errCode = (genErr as { code?: string })?.code;
      if (
        (genErr instanceof LlmError || Boolean(errCode)) &&
        ['NO_KEY', 'INVALID_KEY', 'RATE_LIMITED', 'OFFLINE', 'TIMEOUT', 'NO_PAGE_CONTEXT'].includes(errCode || '')
      ) {
        throw genErr;
      }
      break;
    }

    // NODE 3: critic
    const criticStart = Date.now();
    logger.debug('Executing critic evaluation');

    const evaluation = await evaluateHint(state.candidateHint, state, {
      model: options.model,
      tabId: options.tabId,
      apiKey: options.apiKey,
      mockCriticPass: options.mockCriticPass,
      requestId: options.requestId,
      lowQuotaMode: isLowQuota,
    });
    if (!isLowQuota) {
      totalLlmCalls++;
    }

    state.criticResult = evaluation;
    trace.criticEvaluations.push(evaluation);
    recordNodeTiming('critic', criticStart, {
      pass: evaluation.pass,
      leak: evaluation.leak,
      grounded: evaluation.grounded,
      confidence: evaluation.confidence,
    });

    if (evaluation.pass) {
      logger.info('Critic approved candidate hint');
      deliveredHint = {
        level: state.level,
        text: state.candidateHint.hint,
        codeBlock: state.candidateHint.codeBlock,
        groundedQuote: state.candidateHint.groundedQuote,
        confidence: evaluation.confidence,
        checks: {
          leak: evaluation.leak,
          grounded: evaluation.grounded,
          relevant: evaluation.relevant,
        },
        retries: state.retryCount,
        model: options.model || 'gemini-2.5-flash',
        latencyMs: Date.now() - startTime,
      };
      break;
    }

    // Rejection: prepare for retry or exit to fallback
    state.retryCount++;
    trace.retries = state.retryCount;
    logger.warn(`Critic rejected hint (attempt ${state.retryCount}): ${evaluation.reason}`);

    // Rebuild context prompt injecting critic feedback
    state.assembledPrompt = buildContext(state);
  }

  // --- NODE 4: safe_fallback (if all generation/critic attempts failed) ---
  if (!deliveredHint) {
    const fallbackStart = Date.now();
    logger.warn('Maximum retries exceeded or generator failed; executing safe_fallback node');
    trace.isFallback = true;
    deliveredHint = generateSafeFallback(state);
    deliveredHint.latencyMs = Date.now() - startTime;
    recordNodeTiming('safe_fallback', fallbackStart, { reason: 'critic_retry_limit_exceeded' });
  }

  // --- NODE 5: deliver ---
  const deliverStart = Date.now();
  trace.totalDurationMs = Date.now() - startTime;
  state.finalHint = deliveredHint;

  // Persist hint and telemetry record to local storage
  try {
    const hintId = `hint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await saveHintRecord({
      id: hintId,
      problemHash,
      timestamp: Date.now(),
      hint: deliveredHint,
    });

    await addEventLog({
      id: `evt-${Date.now()}`,
      timestamp: Date.now(),
      type: 'hint_delivered',
      contextHash: problemHash,
      title: context.title || problemHash,
      details: {
        hintLevel: deliveredHint.level,
        confidence: deliveredHint.confidence,
        retries: trace.retries,
        isFallback: trace.isFallback,
        latencyMs: trace.totalDurationMs,
      },
    });
  } catch (storageErr) {
    logger.warn('Failed to persist hint record or event log', storageErr);
  }

  recordNodeTiming('deliver', deliverStart);
  logger.info(`Agent graph finished in ${trace.totalDurationMs}ms (fallback=${trace.isFallback})`);

  trace.llmCallCount = totalLlmCalls;
  trace.lowQuotaMode = isLowQuota;

  return {
    hint: deliveredHint,
    trace,
    candidateHint: state.candidateHint,
  };
}
