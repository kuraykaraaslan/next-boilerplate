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

// ============================================================================
// Per-tenant security policy keys (read via SettingService.getByKeys(tenantId))
// ============================================================================

export const TenantSecuritySettingKeySchema = z.enum([
  'mfaRequired',          // 'true' | 'false' — force MFA for all members
  'mfaRequiredRoles',     // CSV of roles that must use MFA regardless of the flag
  'trustedDeviceTtlDays', // remember-this-device lifetime in days (default 30)
]);
export type TenantSecuritySettingKey = z.infer<typeof TenantSecuritySettingKeySchema>;
export const TENANT_SECURITY_KEYS = TenantSecuritySettingKeySchema.options;
