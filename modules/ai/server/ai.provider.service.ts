import { env } from '@nb/env';
import Logger from '@nb/logger';
import SettingService from '@nb/setting/server/setting.service';
import { AI_KEYS } from './ai.setting.keys';
import BaseAIProvider from './providers/base.provider';
import OpenAIProvider from './providers/openai.provider';
import AnthropicProvider from './providers/anthropic.provider';
import GoogleProvider from './providers/google.provider';
import type { AIProviderType, AIModel, ProviderConfig } from './ai.types';
import { OpenAIModels, AnthropicModels, GoogleModels } from './ai.types';

export interface TenantProviderBundle {
  openai: OpenAIProvider;
  anthropic: AnthropicProvider;
  google: GoogleProvider;
  defaultProvider: AIProviderType;
}

export default class AIProviderService {

  // ──────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────

  private static readonly FALLBACK_DEFAULT_PROVIDER: AIProviderType =
    (env.AI_DEFAULT_PROVIDER as AIProviderType) || 'openai';

  private static readonly _tenantProviders = new Map<string, TenantProviderBundle>();

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

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
      (settings.aiDefaultProvider as AIProviderType | undefined) || AIProviderService.FALLBACK_DEFAULT_PROVIDER;

    return {
      openai: new OpenAIProvider(openaiCfg),
      anthropic: new AnthropicProvider(anthropicCfg),
      google: new GoogleProvider(googleCfg),
      defaultProvider,
    };
  }

  private static async getTenantBundle(tenantId: string): Promise<TenantProviderBundle> {
    let bundle = AIProviderService._tenantProviders.get(tenantId);
    if (!bundle) {
      bundle = await AIProviderService.buildTenantBundle(tenantId);
      AIProviderService._tenantProviders.set(tenantId, bundle);
    }
    return bundle;
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static async getProvider(tenantId: string, providerType?: AIProviderType): Promise<BaseAIProvider> {
    const bundle = await AIProviderService.getTenantBundle(tenantId);
    const type = providerType || bundle.defaultProvider;

    switch (type) {
      case 'openai':
        return bundle.openai;
      case 'anthropic':
        return bundle.anthropic;
      case 'google':
        return bundle.google;
      default:
        Logger.warn(`AIProviderService: Unknown provider "${type}", falling back to default`);
        return bundle[bundle.defaultProvider] as BaseAIProvider;
    }
  }

  static async getDefaultProvider(tenantId: string): Promise<BaseAIProvider> {
    const bundle = await AIProviderService.getTenantBundle(tenantId);
    return AIProviderService.getProvider(tenantId, bundle.defaultProvider);
  }

  static listProviders(): AIProviderType[] {
    return ['openai', 'anthropic', 'google'];
  }

  static async listConfiguredProviders(tenantId: string): Promise<AIProviderType[]> {
    const bundle = await AIProviderService.getTenantBundle(tenantId);
    const out: AIProviderType[] = [];
    if (bundle.openai.isConfigured()) out.push('openai');
    if (bundle.anthropic.isConfigured()) out.push('anthropic');
    if (bundle.google.isConfigured()) out.push('google');
    return out;
  }

  static async isProviderConfigured(tenantId: string, providerType: AIProviderType): Promise<boolean> {
    const provider = await AIProviderService.getProvider(tenantId, providerType);
    return provider.isConfigured();
  }

  static async listModels(tenantId: string, providerType?: AIProviderType): Promise<string[]> {
    const provider = await AIProviderService.getProvider(tenantId, providerType);
    return provider.listModels();
  }

  static listAllModels(): Record<AIProviderType, string[]> {
    return {
      openai: [...OpenAIModels],
      anthropic: [...AnthropicModels],
      google: [...GoogleModels],
    };
  }

  static getProviderForModel(model: AIModel): AIProviderType | null {
    if (OpenAIModels.includes(model as typeof OpenAIModels[number])) return 'openai';
    if (AnthropicModels.includes(model as typeof AnthropicModels[number])) return 'anthropic';
    if (GoogleModels.includes(model as typeof GoogleModels[number])) return 'google';
    return null;
  }

  static reinitializeProvider(tenantId: string, providerType: AIProviderType, config: ProviderConfig): void {
    const bundle = AIProviderService._tenantProviders.get(tenantId);
    if (!bundle) return;
    switch (providerType) {
      case 'openai':    bundle.openai = new OpenAIProvider(config); break;
      case 'anthropic': bundle.anthropic = new AnthropicProvider(config); break;
      case 'google':    bundle.google = new GoogleProvider(config); break;
    }
  }

  static invalidateTenant(tenantId: string): void {
    AIProviderService._tenantProviders.delete(tenantId);
  }
}
