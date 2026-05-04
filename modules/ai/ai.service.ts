import { env } from '@/libs/env';
import Logger from '@/libs/logger';
import redis from '@/libs/redis';

// Providers
import BaseAIProvider from './providers/base.provider';
import OpenAIProvider from './providers/openai.provider';
import AnthropicProvider from './providers/anthropic.provider';
import GoogleProvider from './providers/google.provider';

// Types
import type {
  AIProviderType,
  AIModel,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
} from './ai.types';
import { AIError, OpenAIModels, AnthropicModels, GoogleModels } from './ai.types';

export default class AIService {
  // ============================================================================
  // Configuration
  // ============================================================================

  private static readonly RATE_LIMIT_PREFIX = 'ai:rate-limit:';
  private static readonly USAGE_PREFIX = 'ai:usage:';

  // Default provider from env or fallback
  private static readonly DEFAULT_PROVIDER: AIProviderType =
    (env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';

  // ============================================================================
  // Provider Instances (lazy loaded)
  // ============================================================================

  private static _openaiProvider: OpenAIProvider | null = null;
  private static _anthropicProvider: AnthropicProvider | null = null;
  private static _googleProvider: GoogleProvider | null = null;

  private static get openaiProvider(): OpenAIProvider {
    if (!this._openaiProvider) {
      this._openaiProvider = new OpenAIProvider({
        apiKey: env.OPENAI_API_KEY || '',
        defaultModel: env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
        maxTokens: env.OPENAI_MAX_TOKENS ?? 4096,
      });
    }
    return this._openaiProvider;
  }

  private static get anthropicProvider(): AnthropicProvider {
    if (!this._anthropicProvider) {
      this._anthropicProvider = new AnthropicProvider({
        apiKey: env.ANTHROPIC_API_KEY || '',
        defaultModel: env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
        maxTokens: env.ANTHROPIC_MAX_TOKENS ?? 4096,
      });
    }
    return this._anthropicProvider;
  }

  private static get googleProvider(): GoogleProvider {
    if (!this._googleProvider) {
      this._googleProvider = new GoogleProvider({
        apiKey: env.GOOGLE_AI_API_KEY || '',
        defaultModel: env.GOOGLE_DEFAULT_MODEL || 'gemini-2.0-flash',
        maxTokens: env.GOOGLE_MAX_TOKENS ?? 4096,
      });
    }
    return this._googleProvider;
  }

  // Provider map
  private static readonly PROVIDERS = new Map<AIProviderType, () => BaseAIProvider>([
    ['openai', () => AIService.openaiProvider],
    ['anthropic', () => AIService.anthropicProvider],
    ['google', () => AIService.googleProvider],
  ]);

  // ============================================================================
  // Provider Management
  // ============================================================================

  /**
   * Get a provider instance by type
   */
  static getProvider(providerType?: AIProviderType): BaseAIProvider {
    const type = providerType || this.DEFAULT_PROVIDER;
    const providerGetter = this.PROVIDERS.get(type);

    if (!providerGetter) {
      Logger.warn(`AIService: Unknown provider "${type}", falling back to default`);
      return this.PROVIDERS.get(this.DEFAULT_PROVIDER)!();
    }

    return providerGetter();
  }

  /**
   * Get default provider
   */
  static getDefaultProvider(): BaseAIProvider {
    return this.getProvider(this.DEFAULT_PROVIDER);
  }

  /**
   * List all available provider types
   */
  static listProviders(): AIProviderType[] {
    return Array.from(this.PROVIDERS.keys());
  }

  /**
   * List configured (enabled) providers
   */
  static listConfiguredProviders(): AIProviderType[] {
    return this.listProviders().filter((type) => this.getProvider(type).isConfigured());
  }

  /**
   * Check if a provider is configured
   */
  static isProviderConfigured(providerType: AIProviderType): boolean {
    return this.getProvider(providerType).isConfigured();
  }

  // ============================================================================
  // Model Management
  // ============================================================================

  /**
   * List all models for a provider
   */
  static listModels(providerType?: AIProviderType): string[] {
    return this.getProvider(providerType).listModels();
  }

  /**
   * List all available models across all providers
   */
  static listAllModels(): Record<AIProviderType, string[]> {
    return {
      openai: [...OpenAIModels],
      anthropic: [...AnthropicModels],
      google: [...GoogleModels],
    };
  }

  /**
   * Get provider type for a model
   */
  static getProviderForModel(model: AIModel): AIProviderType | null {
    if (OpenAIModels.includes(model as typeof OpenAIModels[number])) return 'openai';
    if (AnthropicModels.includes(model as typeof AnthropicModels[number])) return 'anthropic';
    if (GoogleModels.includes(model as typeof GoogleModels[number])) return 'google';
    return null;
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  /**
   * Send a chat completion request
   */
  static async chat(options: ChatCompletionOptions & { provider?: AIProviderType }): Promise<ChatCompletionResponse> {
    // Auto-detect provider from model if not specified
    let providerType = options.provider;
    if (!providerType && options.model) {
      providerType = this.getProviderForModel(options.model) || undefined;
    }

    const provider = this.getProvider(providerType);

    if (!provider.isConfigured()) {
      throw new AIError(
        `Provider ${provider.providerType} is not configured`,
        provider.providerType,
        'NOT_CONFIGURED'
      );
    }

    const response = await provider.chat(options);

    // Track usage
    await this.trackUsage(provider.providerType, response.usage?.totalTokens || 0);

    return response;
  }

  /**
   * Send a streaming chat completion request
   */
  static async chatStream(
    options: ChatCompletionOptions & { provider?: AIProviderType },
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    let providerType = options.provider;
    if (!providerType && options.model) {
      providerType = this.getProviderForModel(options.model) || undefined;
    }

    const provider = this.getProvider(providerType);

    if (!provider.isConfigured()) {
      throw new AIError(
        `Provider ${provider.providerType} is not configured`,
        provider.providerType,
        'NOT_CONFIGURED'
      );
    }

    return provider.chatStream(options, onChunk);
  }

  // ============================================================================
  // Embeddings
  // ============================================================================

  /**
   * Generate embeddings
   */
  static async embed(
    options: EmbeddingOptions & { provider?: AIProviderType }
  ): Promise<EmbeddingResponse> {
    const provider = this.getProvider(options.provider);

    if (!provider.isConfigured()) {
      throw new AIError(
        `Provider ${provider.providerType} is not configured`,
        provider.providerType,
        'NOT_CONFIGURED'
      );
    }

    return provider.embed(options);
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  private static async trackUsage(provider: AIProviderType, tokens: number): Promise<void> {
    if (tokens <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `${this.USAGE_PREFIX}${provider}:${today}`;

    try {
      await redis.incrby(key, tokens);
      await redis.expire(key, 86400 * 30); // Keep for 30 days
    } catch (error) {
      Logger.warn(`AIService: Failed to track usage: ${error}`);
    }
  }

  /**
   * Get usage statistics for a provider
   */
  static async getUsage(
    provider: AIProviderType,
    days: number = 30
  ): Promise<Record<string, number>> {
    const usage: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${this.USAGE_PREFIX}${provider}:${dateStr}`;

      try {
        const value = await redis.get(key);
        usage[dateStr] = parseInt(value || '0', 10);
      } catch {
        usage[dateStr] = 0;
      }
    }

    return usage;
  }

  /**
   * Get total usage for a provider
   */
  static async getTotalUsage(provider: AIProviderType, days: number = 30): Promise<number> {
    const usage = await this.getUsage(provider, days);
    return Object.values(usage).reduce((sum, val) => sum + val, 0);
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Check if rate limited
   */
  static async isRateLimited(key: string): Promise<boolean> {
    const rateLimitKey = `${this.RATE_LIMIT_PREFIX}${key}`;
    const existing = await redis.get(rateLimitKey);
    return !!existing;
  }

  /**
   * Set rate limit
   */
  static async setRateLimit(key: string, seconds: number): Promise<void> {
    const rateLimitKey = `${this.RATE_LIMIT_PREFIX}${key}`;
    await redis.set(rateLimitKey, '1', 'EX', seconds);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Simple text completion
   */
  static async complete(
    prompt: string,
    options?: Partial<ChatCompletionOptions> & { provider?: AIProviderType }
  ): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    return response.content;
  }

  /**
   * Ask a question with a system prompt
   */
  static async ask(
    question: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionOptions> & { provider?: AIProviderType }
  ): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: question }],
      systemPrompt,
      ...options,
    });
    return response.content;
  }

  /**
   * Reinitialize a provider with new config (useful after settings change)
   */
  static reinitializeProvider(
    providerType: AIProviderType,
    config: ProviderConfig
  ): void {
    switch (providerType) {
      case 'openai':
        this._openaiProvider = new OpenAIProvider(config);
        break;
      case 'anthropic':
        this._anthropicProvider = new AnthropicProvider(config);
        break;
      case 'google':
        this._googleProvider = new GoogleProvider(config);
        break;
    }
  }
}
