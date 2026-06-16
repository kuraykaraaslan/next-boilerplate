import { env } from '@nb/env';
import type { AIProviderContribution, ProviderConfig, ProviderSettings } from '@nb/ai/server/ai.provider.types';
import GoogleProvider from './providers/google.provider';

/**
 * Google (Gemini) provider contribution for the `ai:provider` extension point.
 */
const contribution: AIProviderContribution = {
  key: 'google',
  settingKeys: ['googleAiApiKey', 'googleDefaultModel', 'googleMaxTokens'],
  resolveConfig(settings: ProviderSettings): ProviderConfig {
    return {
      apiKey: settings.googleAiApiKey || env.GOOGLE_AI_API_KEY || '',
      defaultModel: settings.googleDefaultModel || env.GOOGLE_DEFAULT_MODEL || 'gemini-2.0-flash',
      maxTokens: settings.googleMaxTokens ? Number(settings.googleMaxTokens) : (env.GOOGLE_MAX_TOKENS ?? 4096),
    };
  },
  create(config: ProviderConfig) {
    return new GoogleProvider(config);
  },
};

export default contribution;
