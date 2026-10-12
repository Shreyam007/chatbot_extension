/**
 * LLM Client Types & Contracts for Unstuck (Step 8)
 */

export type LlmErrorCode =
  | 'NO_KEY'
  | 'INVALID_KEY'
  | 'OFFLINE'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'SAFETY_BLOCKED'
  | 'MALFORMED_JSON'
  | 'ABORTED'
  | 'UNKNOWN';

export type S13ScreenTarget =
  | 'S13.1' // Missing or invalid key
  | 'S13.2' // Offline
  | 'S13.3' // Rate limit with Retry-After countdown
  | 'S13.4' // Server error or timeout
  | 'S13.5' // Restricted or safety blocked
  | 'NONE';

export interface TokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface LlmGenerationOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  _retryDelayMs?: number;
  systemInstruction?: string;
  tabId?: number;
  requestId?: string;
  signal?: AbortSignal;
  responseSchema?: Record<string, unknown>;
}

export interface LlmResponse<T = unknown> {
  data: T;
  rawText: string;
  usage: TokenUsage;
  latencyMs: number;
  model: string;
}

export interface GeminiApiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
    role?: string;
  };
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
    blocked?: boolean;
  }>;
}

export interface GeminiApiResponse {
  candidates?: GeminiApiCandidate[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: unknown[];
  };
}
