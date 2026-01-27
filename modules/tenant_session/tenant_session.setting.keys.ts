import { z } from 'zod';

// ============================================================================
// Tenant Security Setting Keys
// ============================================================================

export const TenantSecuritySettingKeySchema = z.enum([
  'twoFactorRequired', 'passwordMinLength', 'passwordRequireUppercase',
  'passwordRequireNumbers', 'passwordRequireSymbols',
  'sessionTimeout', 'maxLoginAttempts', 'ipWhitelist', 'ipBlacklist',
  'ssoEnabled', 'ssoProvider', 'ssoConfig',
]);
export type TenantSecuritySettingKey = z.infer<typeof TenantSecuritySettingKeySchema>;
export const TENANT_SECURITY_KEYS = TenantSecuritySettingKeySchema.options;
