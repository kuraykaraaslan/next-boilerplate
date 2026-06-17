import AIProviderService from './ai.provider.service';
import AIUsageService from './ai.usage.service';
import TenantFeatureGateService from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature.service';
import { FEATURE_KEYS } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.feature-keys';
import { TenantUsageService } from '@kuraykaraaslan/tenant_usage/server/tenant_usage.service';
import { isRootTenant } from '@kuraykaraaslan/tenant/server/tenant.constants';
import type { AIProviderType, ChatCompletionOptions, ChatCompletionResponse, EmbeddingOptions, EmbeddingResponse, ProviderConfig } from './ai.types';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import AiMessages from './ai.messages';

export { AIProviderService, AIUsageService };

export default class AIService {

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

  private static async assertAiFeatureAccess(tenantId: string): Promise<void> {
    if (isRootTenant(tenantId)) return;
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_AI_CHAT);
    const usage = await TenantUsageService.getUsage(tenantId);
    await TenantFeatureGateService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_AI_MONTHLY_TOKENS, usage.aiTokens);
  }

  // ──────────────────────────────────────────────
  // Completion methods (orchestrate provider + usage)
  // ──────────────────────────────────────────────

  static async chat(
    tenantId: string,
    options: ChatCompletionOptions & { provider?: AIProviderType },
  ): Promise<ChatCompletionResponse> {
    await AIService.assertAiFeatureAccess(tenantId);

    let providerType = options.provider;
    if (!providerType && options.model) {
      providerType = AIProviderService.getProviderForModel(options.model) || undefined;
    }

    const provider = await AIProviderService.getProvider(tenantId, providerType);
    if (!provider.isConfigured()) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    const response = await provider.chat(options);
    await AIUsageService.trackUsage(tenantId, provider.providerType, response.usage?.totalTokens || 0);
    await AIUsageService.recordUsage(tenantId, provider.providerType, response, 'chat');
    return response;
  }

  static async chatStream(
    tenantId: string,
    options: ChatCompletionOptions & { provider?: AIProviderType },
    onChunk: (chunk: string) => void,
  ): Promise<ChatCompletionResponse> {
    await AIService.assertAiFeatureAccess(tenantId);

    let providerType = options.provider;
    if (!providerType && options.model) {
      providerType = AIProviderService.getProviderForModel(options.model) || undefined;
    }

    const provider = await AIProviderService.getProvider(tenantId, providerType);
    if (!provider.isConfigured()) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    const response = await provider.chatStream(options, onChunk);
    await AIUsageService.trackUsage(tenantId, provider.providerType, response.usage?.totalTokens || 0);
    await AIUsageService.recordUsage(tenantId, provider.providerType, response, 'stream');
    return response;
  }

  static async embed(
    tenantId: string,
    options: EmbeddingOptions & { provider?: AIProviderType },
  ): Promise<EmbeddingResponse> {
    await AIService.assertAiFeatureAccess(tenantId);

    const provider = await AIProviderService.getProvider(tenantId, options.provider);
    if (!provider.isConfigured()) {
      throw new AppError(AiMessages.PROVIDER_NOT_CONFIGURED, 503, ErrorCode.FEATURE_NOT_AVAILABLE);
    }

    const response = await provider.embed(options);
    await AIUsageService.trackUsage(tenantId, provider.providerType, response.usage?.totalTokens || 0);
    await AIUsageService.recordEmbedUsage(tenantId, provider.providerType, response);
    return response;
  }

  static async complete(
    tenantId: string,
    prompt: string,
    options?: Partial<ChatCompletionOptions> & { provider?: AIProviderType },
  ): Promise<string> {
    const response = await AIService.chat(tenantId, {
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    return response.content;
  }

  static async ask(
    tenantId: string,
    question: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionOptions> & { provider?: AIProviderType },
  ): Promise<string> {
    const response = await AIService.chat(tenantId, {
      messages: [{ role: 'user', content: question }],
      systemPrompt,
      ...options,
    });
    return response.content;
  }

  // ──────────────────────────────────────────────
  // Delegates — Provider
  // ──────────────────────────────────────────────

  static getProvider            = AIProviderService.getProvider.bind(AIProviderService);
  static getDefaultProvider     = AIProviderService.getDefaultProvider.bind(AIProviderService);
  static listProviders          = AIProviderService.listProviders.bind(AIProviderService);
  static listConfiguredProviders = AIProviderService.listConfiguredProviders.bind(AIProviderService);
  static isProviderConfigured   = AIProviderService.isProviderConfigured.bind(AIProviderService);
  static listModels             = AIProviderService.listModels.bind(AIProviderService);
  static listAllModels          = AIProviderService.listAllModels.bind(AIProviderService);
  static getProviderForModel    = AIProviderService.getProviderForModel.bind(AIProviderService);
  static invalidateTenant       = AIProviderService.invalidateTenant.bind(AIProviderService);

  // ──────────────────────────────────────────────
  // Delegates — Usage
  // ──────────────────────────────────────────────

  static getUsage      = AIUsageService.getUsage.bind(AIUsageService);
  static getTotalUsage = AIUsageService.getTotalUsage.bind(AIUsageService);
  static isRateLimited = AIUsageService.isRateLimited.bind(AIUsageService);
  static setRateLimit  = AIUsageService.setRateLimit.bind(AIUsageService);
}
