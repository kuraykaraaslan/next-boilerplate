import { env } from '@nb/env';
import type { AIProviderContribution, ProviderConfig, ProviderSettings } from '@nb/ai/server/ai.provider.types';
import AnthropicProvider from './providers/anthropic.provider';

/**
 * Anthropic provider contribution for the `ai:provider` extension point.
 */
const contribution: AIProviderContribution = {
  key: 'anthropic',
  settingKeys: ['anthropicApiKey', 'anthropicDefaultModel', 'anthropicMaxTokens'],
  resolveConfig(settings: ProviderSettings): ProviderConfig {
    return {
      apiKey: settings.anthropicApiKey || env.ANTHROPIC_API_KEY || '',
      defaultModel: settings.anthropicDefaultModel || env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
      maxTokens: settings.anthropicMaxTokens ? Number(settings.anthropicMaxTokens) : (env.ANTHROPIC_MAX_TOKENS ?? 4096),
    };
  },
  create(config: ProviderConfig) {
    return new AnthropicProvider(config);
  },
};

export default contribution;
