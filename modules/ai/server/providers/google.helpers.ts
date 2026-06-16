import type { ChatCompletionOptions } from '../ai.types';
import { AIError, AIRateLimitError, AIAuthenticationError } from '../ai.types';

export interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }>; role: string };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: string;
}

export interface GeminiEmbeddingResponse {
  embedding: { values: number[] };
}

/** Shared request context derived from a provider instance. */
export interface GoogleCtx {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  maxTokens: number;
}

/** Convert the generic chat messages into Gemini `contents` + systemInstruction. */
export function buildGeminiContents(
  options: ChatCompletionOptions,
): { contents: GeminiContent[]; systemInstruction?: string } {
  const contents: GeminiContent[] = [];
  let systemInstruction: string | undefined;

  for (const msg of options.messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  if (options.systemPrompt) {
    systemInstruction = options.systemPrompt;
  }

  return { contents, systemInstruction };
}

export async function handleGoogleError(response: Response): Promise<never> {
  const status = response.status;

  if (status === 401 || status === 403) {
    throw new AIAuthenticationError('google');
  }

  if (status === 429) {
    throw new AIRateLimitError('google');
  }

  const errorBody = await response.text();
  throw new AIError(`Google API error: ${errorBody}`, 'google', 'API_ERROR', status);
}
