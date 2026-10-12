import type { PageContext } from '../../shared/schemas/context';
import type { Hint, HintLevel } from '../../shared/schemas/hints';

export interface GeneratedHintCandidate {
  hint: string;
  codeBlock?: string;
  topics: string[];
  groundedQuote?: string;
  answerable_from_page?: boolean;
  selfConfidence: number;
}

export interface CriticEvaluation {
  pass: boolean;
  leak: boolean;
  grounded: boolean;
  relevant: boolean;
  confidence: number;
  reason: string;
}

export interface TraceNodeTiming {
  node: string;
  startTime: number;
  durationMs: number;
  details?: Record<string, unknown>;
}

export interface AgentRunTrace {
  id: string;
  problemHash: string;
  requestedLevel: HintLevel;
  startTime: number;
  totalDurationMs: number;
  nodeTimings: TraceNodeTiming[];
  retries: number;
  criticEvaluations: CriticEvaluation[];
  isFallback: boolean;
  model: string;
  llmCallCount?: number;
  promptTokens?: number;
  candidateTokens?: number;
}

export interface AgentGraphState {
  context: PageContext;
  level: HintLevel;
  mastery?: number;
  history?: Hint[];
  userCode?: string;
  userQuery?: string;
  assembledPrompt?: string;
  candidateHint?: GeneratedHintCandidate;
  criticResult?: CriticEvaluation;
  retryCount: number;
  finalHint?: Hint;
  trace: AgentRunTrace;
  error?: string;
}

export interface AgentGraphOptions {
  apiKey?: string;
  model?: string;
  tabId?: number;
  requestId?: string;
  deadlineMs?: number;
  maxRetries?: number;
  userQuery?: string;
  userCode?: string;
  mastery?: number;
  history?: Hint[];
  mockCriticPass?: boolean;
  timeoutMs?: number;
}
