import BaseAIProvider from '@kuraykaraaslan/ai/server/providers/base.provider';
import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from '@kuraykaraaslan/ai/server/ai.types';
import { AIError } from '@kuraykaraaslan/ai/server/ai.types';
import type { GoogleCtx } from './google.helpers';
import { runChat, runChatStream, runEmbed } from './google.transport';

// Models Google serves. Mirror this list in modules/ai_google/module.json
// `extensions[].metadata.models` (the registry reads that for code-free listing).
export const GoogleModels = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
] as const;

/**
 * Google (Gemini) AI provider. The request/response plumbing lives in
 * `google.transport` (chat / stream / embed) and `google.helpers` (content
 * conversion, error mapping, shared types); this class wires a provider
 * instance's config into those functions.
 */
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

  private ctx(): GoogleCtx {
    return {
      baseUrl: this.baseUrl,
      apiKey: this.config.apiKey,
      defaultModel: this.config.defaultModel,
      maxTokens: this.getMaxTokens(),
    };
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Google API key not configured', 'google', 'NOT_CONFIGURED');
    }
    return runChat(this.ctx(), options);
  }

  async chatStream(
    options: ChatCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Google API key not configured', 'google', 'NOT_CONFIGURED');
    }
    return runChatStream(this.ctx(), options, onChunk);
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    if (!this.isConfigured()) {
      throw new AIError('Google API key not configured', 'google', 'NOT_CONFIGURED');
    }
    return runEmbed(this.ctx(), options);
  }
}
