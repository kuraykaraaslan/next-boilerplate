import { env } from '@nb/env';
import type { AIProviderContribution, ProviderConfig, ProviderSettings } from '@nb/ai/server/ai.provider.types';
import OpenAIProvider from './providers/openai.provider';

/**
 * OpenAI provider contribution for the `ai:provider` extension point. The host
 * `AIProviderService` discovers this (gated by the tenant's enabled modules)
 * and never imports OpenAIProvider directly.
 */
const contribution: AIProviderContribution = {
  key: 'openai',
  settingKeys: ['openaiApiKey', 'openaiDefaultModel', 'openaiMaxTokens', 'openaiBaseUrl'],
  resolveConfig(settings: ProviderSettings): ProviderConfig {
    return {
      apiKey: settings.openaiApiKey || env.OPENAI_API_KEY || '',
      defaultModel: settings.openaiDefaultModel || env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      maxTokens: settings.openaiMaxTokens ? Number(settings.openaiMaxTokens) : (env.OPENAI_MAX_TOKENS ?? 4096),
      baseUrl: settings.openaiBaseUrl || undefined,
    };
  },
  create(config: ProviderConfig) {
    return new OpenAIProvider(config);
  },
};

export default contribution;
