import BaseAIProvider from '@kuraykaraaslan/ai/server/providers/base.provider';
import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from '@kuraykaraaslan/ai/server/ai.types';
import { AIError } from '@kuraykaraaslan/ai/server/ai.types';
import type { OpenAICtx } from './openai.helpers';
import { runChat, runChatStream, runEmbed } from './openai.transport';

// Models OpenAI serves. Mirror this list in modules/ai_openai/module.json
// `extensions[].metadata.models` (the registry reads that for code-free listing).
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

/**
 * OpenAI (and OpenAI-compatible) AI provider. The request/response plumbing
 * lives in `openai.transport` (chat / stream / embed) and `openai.helpers`
 * (message building, error mapping, shared types); this class wires a provider
 * instance's config into those functions.
 */
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

  private ctx(): OpenAICtx {
    return {
      baseUrl: this.baseUrl,
      apiKey: this.config.apiKey,
      defaultModel: this.config.defaultModel,
      maxTokens: this.getMaxTokens(),
    };
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('OpenAI API key not configured', 'openai', 'NOT_CONFIGURED');
    }
    return runChat(this.ctx(), options);
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('OpenAI API key not configured', 'openai', 'NOT_CONFIGURED');
    }
    return runChatStream(this.ctx(), options, onChunk);
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.isConfigured()) {
      throw new AIError('OpenAI API key not configured', 'openai', 'NOT_CONFIGURED');
    }
    return runEmbed(this.ctx(), options);
  }
}
