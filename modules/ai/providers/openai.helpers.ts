import type { ChatCompletionOptions } from '../ai.types';
import { AIError, AIRateLimitError, AIAuthenticationError } from '../ai.types';

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
  model: string;
}

/** Shared request context derived from a provider instance. */
export interface OpenAICtx {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  maxTokens: number;
}

/** Build the OpenAI `messages` array (systemPrompt prepended, then chat turns). */
export function buildOpenAIMessages(options: ChatCompletionOptions): OpenAIChatMessage[] {
  const messages: OpenAIChatMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push(
    ...options.messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))
  );
  return messages;
}

export async function handleOpenAIError(response: Response): Promise<never> {
  const status = response.status;

  if (status === 401) {
    throw new AIAuthenticationError('openai');
  }

  if (status === 429) {
    const retryAfter = response.headers.get('retry-after');
    throw new AIRateLimitError('openai', retryAfter ? parseInt(retryAfter, 10) : undefined);
  }

  const errorBody = await response.text();
  throw new AIError(`OpenAI API error: ${errorBody}`, 'openai', 'API_ERROR', status);
}
