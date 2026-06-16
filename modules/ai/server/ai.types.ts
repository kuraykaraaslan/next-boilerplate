import { z } from 'zod';

// ============================================================================
// Provider Types
// ============================================================================

// Open-ended: provider keys are supplied by satellite provider modules
// (point `ai:provider`), not fixed in the host. Validate at API boundaries
// against the set of enabled providers rather than a closed union.
export type AIProviderType = string;

// ============================================================================
// Model Definitions
// ============================================================================

// Model ids are likewise open-ended — each provider module owns its own model
// list (manifest `metadata.models` + the provider's `listModels()`).
export type AIModel = string;

// ============================================================================
// Message Types
// ============================================================================

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  provider: AIProviderType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface EmbeddingOptions {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  provider: AIProviderType;
  usage?: {
    totalTokens: number;
  };
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  apiKey: string;
  defaultModel?: string;
  maxTokens?: number;
  baseUrl?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class AIError extends Error {
  constructor(
    message: string,
    public provider: AIProviderType,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIRateLimitError extends AIError {
  constructor(provider: AIProviderType, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', 429);
    this.name = 'AIRateLimitError';
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class AIAuthenticationError extends AIError {
  constructor(provider: AIProviderType) {
    super(`Authentication failed for ${provider}`, provider, 'AUTH_ERROR', 401);
    this.name = 'AIAuthenticationError';
  }
}
