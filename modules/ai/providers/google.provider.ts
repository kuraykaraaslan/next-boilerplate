import BaseAIProvider from './base.provider';
import Logger from '@/libs/logger';
import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from '../ai.types';
import { GoogleModels, AIError, AIRateLimitError, AIAuthenticationError } from '../ai.types';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
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

interface GeminiEmbeddingResponse {
  embedding: { values: number[] };
}

export default class GoogleProvider extends BaseAIProvider {
  readonly providerType = 'google' as const;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  listModels(): string[] {
    return [...GoogleModels];
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Google API key not configured', 'google', 'NOT_CONFIGURED');
    }

    const model = options.model || this.config.defaultModel || 'gemini-2.0-flash';

    // Convert messages to Gemini format
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

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction: systemInstruction
              ? { parts: [{ text: systemInstruction }] }
              : undefined,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? this.getMaxTokens(),
              topP: options.topP ?? 1,
            },
          }),
        }
      );

      if (!response.ok) {
        await this.handleError(response);
      }

      const data: GeminiResponse = await response.json();
      const content = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join('') || '';

      return {
        content,
        model: data.modelVersion || model,
        provider: 'google',
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount,
              completionTokens: data.usageMetadata.candidatesTokenCount,
              totalTokens: data.usageMetadata.totalTokenCount,
            }
          : undefined,
        finishReason: data.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`Google chat error: ${error}`);
      throw new AIError(`Google request failed: ${error}`, 'google');
    }
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Google API key not configured', 'google', 'NOT_CONFIGURED');
    }

    const model = options.model || this.config.defaultModel || 'gemini-2.0-flash';

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

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            systemInstruction: systemInstruction
              ? { parts: [{ text: systemInstruction }] }
              : undefined,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? this.getMaxTokens(),
              topP: options.topP ?? 1,
            },
          }),
        }
      );

      if (!response.ok) {
        await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIError('No response body', 'google');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              fullContent += text;
              onChunk(text);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      return {
        content: fullContent,
        model,
        provider: 'google',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`Google stream error: ${error}`);
      throw new AIError(`Google stream failed: ${error}`, 'google');
    }
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Google API key not configured', 'google', 'NOT_CONFIGURED');
    }

    const model = options.model || 'text-embedding-004';
    const inputs = Array.isArray(options.input) ? options.input : [options.input];

    try {
      const embeddings: number[][] = [];

      for (const input of inputs) {
        const response = await fetch(
          `${this.baseUrl}/models/${model}:embedContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: { parts: [{ text: input }] },
            }),
          }
        );

        if (!response.ok) {
          await this.handleError(response);
        }

        const data: GeminiEmbeddingResponse = await response.json();
        embeddings.push(data.embedding.values);
      }

      return {
        embeddings,
        model,
        provider: 'google',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`Google embedding error: ${error}`);
      throw new AIError(`Google embedding failed: ${error}`, 'google');
    }
  }

  private async handleError(response: Response): Promise<never> {
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
}
