import BaseAIProvider from './base.provider';
import Logger from '@/modules/logger';
import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from '../ai.types';
import { OpenAIModels, AIError, AIRateLimitError, AIAuthenticationError } from '../ai.types';

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatResponse {
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

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
  usage: { total_tokens: number };
  model: string;
}

export default class OpenAIProvider extends BaseAIProvider {
  readonly providerType = 'openai' as const;
  private readonly baseUrl: string;

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  listModels(): string[] {
    return [...OpenAIModels];
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('OpenAI API key not configured', 'openai', 'NOT_CONFIGURED');
    }

    const model = options.model || this.config.defaultModel || 'gpt-4o-mini';
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

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? this.getMaxTokens(),
          top_p: options.topP ?? 1,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data: OpenAIChatResponse = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        provider: 'openai',
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        finishReason: data.choices[0]?.finish_reason,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`OpenAI chat error: ${error}`);
      throw new AIError(`OpenAI request failed: ${error}`, 'openai');
    }
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('OpenAI API key not configured', 'openai', 'NOT_CONFIGURED');
    }

    const model = options.model || this.config.defaultModel || 'gpt-4o-mini';
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

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? this.getMaxTokens(),
          top_p: options.topP ?? 1,
          stream: true,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIError('No response body', 'openai');
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
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      return {
        content: fullContent,
        model,
        provider: 'openai',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`OpenAI stream error: ${error}`);
      throw new AIError(`OpenAI stream failed: ${error}`, 'openai');
    }
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.isConfigured()) {
      throw new AIError('OpenAI API key not configured', 'openai', 'NOT_CONFIGURED');
    }

    const model = options.model || 'text-embedding-3-small';

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: options.input,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data: OpenAIEmbeddingResponse = await response.json();

      return {
        embeddings: data.data.map((d) => d.embedding),
        model: data.model,
        provider: 'openai',
        usage: {
          totalTokens: data.usage.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`OpenAI embedding error: ${error}`);
      throw new AIError(`OpenAI embedding failed: ${error}`, 'openai');
    }
  }

  private async handleError(response: Response): Promise<never> {
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
}
