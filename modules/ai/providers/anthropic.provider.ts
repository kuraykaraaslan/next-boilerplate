import BaseAIProvider from './base.provider';
import Logger from '@/modules/logger';
import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from '../ai.types';
import { AnthropicModels, AIError, AIRateLimitError, AIAuthenticationError } from '../ai.types';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export default class AnthropicProvider extends BaseAIProvider {
  readonly providerType = 'anthropic' as const;
  private readonly baseUrl: string;
  private readonly apiVersion = '2023-06-01';

  constructor(config: ProviderConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  listModels(): string[] {
    return [...AnthropicModels];
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Anthropic API key not configured', 'anthropic', 'NOT_CONFIGURED');
    }

    const model = options.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022';

    // Anthropic requires alternating user/assistant messages
    const messages: AnthropicMessage[] = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Extract system message if present
    const systemMessage =
      options.systemPrompt ||
      options.messages.find((m) => m.role === 'system')?.content;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model,
          messages,
          system: systemMessage,
          max_tokens: options.maxTokens ?? this.getMaxTokens(),
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 1,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const data: AnthropicResponse = await response.json();
      const content = data.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('');

      return {
        content,
        model: data.model,
        provider: 'anthropic',
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finishReason: data.stop_reason,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`Anthropic chat error: ${error}`);
      throw new AIError(`Anthropic request failed: ${error}`, 'anthropic');
    }
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Anthropic API key not configured', 'anthropic', 'NOT_CONFIGURED');
    }

    const model = options.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022';

    const messages: AnthropicMessage[] = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage =
      options.systemPrompt ||
      options.messages.find((m) => m.role === 'system')?.content;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify({
          model,
          messages,
          system: systemMessage,
          max_tokens: options.maxTokens ?? this.getMaxTokens(),
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 1,
          stream: true,
        }),
      });

      if (!response.ok) {
        await this.handleError(response);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIError('No response body', 'anthropic');
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
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text || '';
              if (text) {
                fullContent += text;
                onChunk(text);
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      return {
        content: fullContent,
        model,
        provider: 'anthropic',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      Logger.error(`Anthropic stream error: ${error}`);
      throw new AIError(`Anthropic stream failed: ${error}`, 'anthropic');
    }
  }

  async embed(_options: EmbeddingOptions): Promise<EmbeddingResponse> {
    // Anthropic doesn't have an embedding API yet
    throw new AIError('Anthropic does not support embeddings', 'anthropic', 'NOT_SUPPORTED');
  }

  private async handleError(response: Response): Promise<never> {
    const status = response.status;

    if (status === 401) {
      throw new AIAuthenticationError('anthropic');
    }

    if (status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new AIRateLimitError('anthropic', retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    const errorBody = await response.text();
    throw new AIError(`Anthropic API error: ${errorBody}`, 'anthropic', 'API_ERROR', status);
  }
}
