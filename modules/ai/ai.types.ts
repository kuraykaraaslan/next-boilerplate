import { z } from 'zod';

// ============================================================================
// Provider Types
// ============================================================================

export type AIProviderType = 'openai' | 'anthropic' | 'google';

// ============================================================================
// Model Definitions
// ============================================================================

export const OpenAIModels = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o1-preview',
] as const;

export const AnthropicModels = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
] as const;

export const GoogleModels = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const;

export type OpenAIModel = typeof OpenAIModels[number];
export type AnthropicModel = typeof AnthropicModels[number];
export type GoogleModel = typeof GoogleModels[number];
export type AIModel = OpenAIModel | AnthropicModel | GoogleModel;

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
