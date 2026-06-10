import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import redis from '@/modules/redis';
import SettingService from '@/modules/setting/setting.service';
import { TenantUsageService } from '@/modules/tenant_usage/tenant_usage.service';
import { tenantDataSourceFor } from '@/modules/db';
import { AiUsageLog } from './entities/ai_usage_log.entity';
import { AI_KEYS } from './ai.setting.keys';
import TenantFeatureGateService from '@/modules/tenant_subscription/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
import { isRootTenant } from '@/modules/tenant/tenant.constants';

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
import { AppError, ErrorCode } from '@/modules/common/app-error';
import { OpenAIModels, AnthropicModels, GoogleModels } from './ai.types';
import AiMessages from './ai.messages';

interface TenantProviderBundle {
  openai: OpenAIProvider;
  anthropic: AnthropicProvider;
  google: GoogleProvider;
  defaultProvider: AIProviderType;
}

export default class AIService {
  // ============================================================================
  // Configuration
  // ============================================================================

  private static readonly RATE_LIMIT_PREFIX = 'ai:rate-limit:';
  private static readonly USAGE_PREFIX = 'ai:usage:';

  // Fallback default provider when neither tenant Setting nor env specifies one
  private static readonly FALLBACK_DEFAULT_PROVIDER: AIProviderType =
    (env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';

  // Per-tenant provider cache (keyed by tenantId)
  private static readonly _tenantProviders = new Map<string, TenantProviderBundle>();

  // ============================================================================
  // Tenant-aware Provider Resolution
  // ============================================================================

  /**
   * Build a per-tenant bundle of providers from that tenant's Setting rows.
   * Falls back to env values when a key is missing in Settings.
   */
  private static async buildTenantBundle(tenantId: string): Promise<TenantProviderBundle> {
    const settings = await SettingService.getByKeys(tenantId, [...AI_KEYS]);

    const openaiCfg: ProviderConfig = {
      apiKey: settings.openaiApiKey || env.OPENAI_API_KEY || '',
      defaultModel: settings.openaiDefaultModel || env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: settings.openaiMaxTokens ? Number(settings.openaiMaxTokens) : (env.OPENAI_MAX_TOKENS ?? 4096),
      baseUrl: settings.openaiBaseUrl || undefined,
    };

    const anthropicCfg: ProviderConfig = {
      apiKey: settings.anthropicApiKey || env.ANTHROPIC_API_KEY || '',
      defaultModel: settings.anthropicDefaultModel || env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
      maxTokens: settings.anthropicMaxTokens ? Number(settings.anthropicMaxTokens) : (env.ANTHROPIC_MAX_TOKENS ?? 4096),
    };

    const googleCfg: ProviderConfig = {
      apiKey: settings.googleAiApiKey || env.GOOGLE_AI_API_KEY || '',
      defaultModel: settings.googleDefaultModel || env.GOOGLE_DEFAULT_MODEL || 'gemini-2.0-flash',
      maxTokens: settings.googleMaxTokens ? Number(settings.googleMaxTokens) : (env.GOOGLE_MAX_TOKENS ?? 4096),
    };

    const defaultProvider =
      (settings.aiDefaultProvider as AIProviderType | undefined) || AIService.FALLBACK_DEFAULT_PROVIDER;

    return {
      openai: new OpenAIProvider(openaiCfg),
      anthropic: new AnthropicProvider(anthropicCfg),
      google: new GoogleProvider(googleCfg),
      defaultProvider,
    };
  }

  /**
   * Get (or lazily build) the per-tenant provider bundle.
   */
  private static async getTenantBundle(tenantId: string): Promise<TenantProviderBundle> {
    let bundle = AIService._tenantProviders.get(tenantId);
    if (!bundle) {
      bundle = await AIService.buildTenantBundle(tenantId);
      AIService._tenantProviders.set(tenantId, bundle);
    }
    return bundle;
  }

  /**
   * Get a provider instance for a tenant.
   */
  static async getProvider(tenantId: string, providerType?: AIProviderType): Promise<BaseAIProvider> {
    const bundle = await AIService.getTenantBundle(tenantId);
    const type = providerType || bundle.defaultProvider;

    switch (type) {
      case 'openai':
        return bundle.openai;
      case 'anthropic':
        return bundle.anthropic;
      case 'google':
        return bundle.google;
      default:
        Logger.warn(`AIService: Unknown provider "${type}", falling back to default`);
        return bundle[bundle.defaultProvider] as BaseAIProvider;
    }
  }

  /**
   * Get the default provider for a tenant.
   */
  static async getDefaultProvider(tenantId: string): Promise<BaseAIProvider> {
    const bundle = await AIService.getTenantBundle(tenantId);
    return AIService.getProvider(tenantId, bundle.defaultProvider);
  }

  /**
   * List all known provider types (static — independent of tenant).
   */
  static listProviders(): AIProviderType[] {
    return ['openai', 'anthropic', 'google'];
  }

  /**
   * List configured (enabled) providers for a tenant.
   */
  static async listConfiguredProviders(tenantId: string): Promise<AIProviderType[]> {
    const bundle = await AIService.getTenantBundle(tenantId);
    const out: AIProviderType[] = [];
    if (bundle.openai.isConfigured()) out.push('openai');
    if (bundle.anthropic.isConfigured()) out.push('anthropic');
    if (bundle.google.isConfigured()) out.push('google');
    return out;
  }

  /**
   * Check if a provider is configured for a tenant.
   */
  static async isProviderConfigured(tenantId: string, providerType: AIProviderType): Promise<boolean> {
    const provider = await AIService.getProvider(tenantId, providerType);
    return provider.isConfigured();
  }

  // ============================================================================
  // Model Management
  // ============================================================================

  /**
   * List all models for a provider (tenant-scoped for default provider resolution).
   */
  static async listModels(tenantId: string, providerType?: AIProviderType): Promise<string[]> {
    const provider = await AIService.getProvider(tenantId, providerType);
    return provider.listModels();
  }

  /**
   * List all available models across all providers (static, model catalog).
   */
  static listAllModels(): Record<AIProviderType, string[]> {
    return {
      openai: [...OpenAIModels],
      anthropic: [...AnthropicModels],
      google: [...GoogleModels],
    };
  }

  /**
   * Get provider type for a model.
   */
  static getProviderForModel(model: AIModel): AIProviderType | null {
    if (OpenAIModels.includes(model as typeof OpenAIModels[number])) return 'openai';
    if (AnthropicModels.includes(model as typeof AnthropicModels[number])) return 'anthropic';
    if (GoogleModels.includes(model as typeof GoogleModels[number])) return 'google';
    return null;
  }

  // ============================================================================
  // Billing-aware feature gating
  // ============================================================================

  /**
   * Defense-in-depth subscription gate for AI usage. Asserts the tenant's
   * active plan grants the `feature_ai_chat` BOOLEAN and that the rolling
   * `feature_ai_monthly_tokens` LIMIT (compared against TenantUsage.aiTokens
   * for the current month) is not exhausted.
   *
   * Root tenant is short-circuited — the platform owner does not purchase
   * its own plan. Best-effort: the LIMIT check is not atomic so a small
   * over-run is possible under concurrent calls; acceptable for boilerplate
   * billing semantics.
   */
  private static async assertAiFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return;

    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_AI_CHAT);

    const usage = await TenantUsageService.getUsage(tenantId);
    await TenantFeatureGateService.assertFeatureAccess(
      tenantId,
      FEATURE_KEYS.FEATURE_AI_MONTHLY_TOKENS,
      usage.aiTokens,
    );
  }

  // ============================================================================
  // Chat Completion
  // ============================================================================

  /**
   * Send a chat completion request for a tenant.
   */
  static async chat(
    tenantId: string,
    options: ChatCompletionOptions & { provider?: AIProviderType }
  ): Promise<ChatCompletionResponse> {
    await AIService.assertAiFeatureAccess(tenantId);

    let providerType = options.provider;
    if (!providerType && options.model) {
      providerType = AIService.getProviderForModel(options.model) || undefined;
    }

    const provider = await AIService.getProvider(tenantId, providerType);

    if (!provider.isConfigured()) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    const response = await provider.chat(options);

    // Track usage (per-tenant)
    await AIService.trackUsage(tenantId, provider.providerType, response.usage?.totalTokens || 0);
    await AIService.recordUsage(tenantId, provider.providerType, response, 'chat');

    return response;
  }

  /**
   * Send a streaming chat completion request for a tenant.
   */
  static async chatStream(
    tenantId: string,
    options: ChatCompletionOptions & { provider?: AIProviderType },
    onChunk: (chunk: string) => void
  ): Promise<ChatCompletionResponse> {
    await AIService.assertAiFeatureAccess(tenantId);

    let providerType = options.provider;
    if (!providerType && options.model) {
      providerType = AIService.getProviderForModel(options.model) || undefined;
    }

    const provider = await AIService.getProvider(tenantId, providerType);

    if (!provider.isConfigured()) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    const response = await provider.chatStream(options, onChunk);

    await AIService.trackUsage(tenantId, provider.providerType, response.usage?.totalTokens || 0);
    await AIService.recordUsage(tenantId, provider.providerType, response, 'stream');

    return response;
  }

  // ============================================================================
  // Embeddings
  // ============================================================================

  /**
   * Generate embeddings for a tenant.
   */
  static async embed(
    tenantId: string,
    options: EmbeddingOptions & { provider?: AIProviderType }
  ): Promise<EmbeddingResponse> {
    await AIService.assertAiFeatureAccess(tenantId);

    const provider = await AIService.getProvider(tenantId, options.provider);

    if (!provider.isConfigured()) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    const response = await provider.embed(options);

    await AIService.trackUsage(tenantId, provider.providerType, response.usage?.totalTokens || 0);
    await AIService.recordEmbedUsage(tenantId, provider.providerType, response);

    return response;
  }

  // ============================================================================
  // Usage Tracking
  // ============================================================================

  private static async trackUsage(tenantId: string, provider: AIProviderType, tokens: number): Promise<void> {
    if (tokens <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `${AIService.USAGE_PREFIX}${tenantId}:${provider}:${today}`;

    try {
      await redis.incrby(key, tokens);
      await redis.expire(key, 86400 * 30); // Keep for 30 days
    } catch (error) {
      Logger.warn(`AIService: Failed to track usage: ${error}`);
    }

    // Bridge to the tenant_usage monthly counter (DB-backed via flushToDb CRON).
    await TenantUsageService.incrementAiTokens(tenantId, tokens);
  }

  /**
   * Persist a per-call AiUsageLog row for chat / stream completions.
   * Best-effort — failure never breaks the response.
   */
  private static async recordUsage(
    tenantId: string,
    provider: AIProviderType,
    response: ChatCompletionResponse,
    kind: 'chat' | 'stream',
  ): Promise<void> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AiUsageLog);
      const row = repo.create({
        tenantId,
        provider,
        model: response.model,
        kind,
        inputTokens: response.usage?.promptTokens ?? 0,
        outputTokens: response.usage?.completionTokens ?? 0,
        totalTokens: response.usage?.totalTokens ?? 0,
      });
      await repo.save(row);
    } catch (error) {
      Logger.warn(
        `AIService.recordUsage failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Persist a per-call AiUsageLog row for embed calls.
   */
  private static async recordEmbedUsage(
    tenantId: string,
    provider: AIProviderType,
    response: EmbeddingResponse,
  ): Promise<void> {
    try {
      const ds = await tenantDataSourceFor(tenantId);
      const repo = ds.getRepository(AiUsageLog);
      const row = repo.create({
        tenantId,
        provider,
        model: response.model,
        kind: 'embed',
        inputTokens: response.usage?.totalTokens ?? 0,
        outputTokens: 0,
        totalTokens: response.usage?.totalTokens ?? 0,
      });
      await repo.save(row);
    } catch (error) {
      Logger.warn(
        `AIService.recordEmbedUsage failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get usage statistics for a provider (tenant-scoped).
   */
  static async getUsage(
    tenantId: string,
    provider: AIProviderType,
    days: number = 30
  ): Promise<Record<string, number>> {
    const usage: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${AIService.USAGE_PREFIX}${tenantId}:${provider}:${dateStr}`;

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
   * Get total usage for a tenant's provider over a number of days.
   */
  static async getTotalUsage(tenantId: string, provider: AIProviderType, days: number = 30): Promise<number> {
    const usage = await AIService.getUsage(tenantId, provider, days);
    return Object.values(usage).reduce((sum, val) => sum + val, 0);
  }

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  /**
   * Check if rate limited.
   */
  static async isRateLimited(key: string): Promise<boolean> {
    const rateLimitKey = `${AIService.RATE_LIMIT_PREFIX}${key}`;
    const existing = await redis.get(rateLimitKey);
    return !!existing;
  }

  /**
   * Set rate limit.
   */
  static async setRateLimit(key: string, seconds: number): Promise<void> {
    const rateLimitKey = `${AIService.RATE_LIMIT_PREFIX}${key}`;
    await redis.set(rateLimitKey, '1', 'EX', seconds);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Simple text completion for a tenant.
   */
  static async complete(
    tenantId: string,
    prompt: string,
    options?: Partial<ChatCompletionOptions> & { provider?: AIProviderType }
  ): Promise<string> {
    const response = await AIService.chat(tenantId, {
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    return response.content;
  }

  /**
   * Ask a question with a system prompt for a tenant.
   */
  static async ask(
    tenantId: string,
    question: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionOptions> & { provider?: AIProviderType }
  ): Promise<string> {
    const response = await AIService.chat(tenantId, {
      messages: [{ role: 'user', content: question }],
      systemPrompt,
      ...options,
    });
    return response.content;
  }

  /**
   * Reinitialize a provider for a tenant with new config (useful after settings change).
   */
  static reinitializeProvider(
    tenantId: string,
    providerType: AIProviderType,
    config: ProviderConfig
  ): void {
    const bundle = AIService._tenantProviders.get(tenantId);
    if (!bundle) {
      // Nothing cached yet; next call will rebuild from Settings.
      return;
    }
    switch (providerType) {
      case 'openai':
        bundle.openai = new OpenAIProvider(config);
        break;
      case 'anthropic':
        bundle.anthropic = new AnthropicProvider(config);
        break;
      case 'google':
        bundle.google = new GoogleProvider(config);
        break;
    }
  }

  /**
   * Invalidate the cached provider bundle for a tenant (call after Settings change).
   */
  static invalidateTenant(tenantId: string): void {
    AIService._tenantProviders.delete(tenantId);
  }
}
