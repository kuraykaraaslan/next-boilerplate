import { z } from 'zod';

// ============================================================================
// AI Setting Keys (System-level AI configuration)
// ============================================================================

export const AiSettingKeySchema = z.enum([
  // General AI Settings
  'aiEnabled', 'aiDefaultProvider', 'aiDailyLimit', 'aiMonthlyBudget',

  // OpenAI Configuration
  'openaiApiKey', 'openaiDefaultModel', 'openaiMaxTokens', 'openaiBaseUrl',

  // Anthropic Configuration
  'anthropicApiKey', 'anthropicDefaultModel', 'anthropicMaxTokens',

  // Google (Gemini) Configuration
  'googleAiApiKey', 'googleDefaultModel', 'googleMaxTokens',

  // Other AI Services
  'huggingfaceToken',
  'tinymceApiKey',
]);
export type AiSettingKey = z.infer<typeof AiSettingKeySchema>;
export const AI_KEYS = AiSettingKeySchema.options;
