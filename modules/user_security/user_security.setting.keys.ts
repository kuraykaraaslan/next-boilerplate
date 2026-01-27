import { z } from 'zod';

// ============================================================================
// Security Setting Keys (System-level security configuration)
// ============================================================================

export const SecuritySettingKeySchema = z.enum([
  'rateLimitPerMinute', 'rateLimitPerHour', 'rateLimitEnabled',
  'corsAllowedOrigins', 'hstsEnabled', 'xContentTypeOptions', 'xFrameOptions', 'blockedIps',
  'recaptchaEnabled', 'recaptchaClientKey', 'recaptchaServerKey',
  'maxmindAccountId', 'maxmindApiKey',
  'cronSecret',
]);
export type SecuritySettingKey = z.infer<typeof SecuritySettingKeySchema>;
export const SECURITY_KEYS = SecuritySettingKeySchema.options;
