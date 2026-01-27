import { z } from 'zod';

// ============================================================================
// Tenant General Setting Keys
// ============================================================================

export const TenantGeneralSettingKeySchema = z.enum([
  'tenantName', 'tenantDescription', 'logoUrl', 'faviconUrl',
  'primaryColor', 'secondaryColor', 'accentColor',
  'contactEmail', 'contactPhone', 'contactAddress',
  'timezone', 'language', 'dateFormat', 'timeFormat',
]);
export type TenantGeneralSettingKey = z.infer<typeof TenantGeneralSettingKeySchema>;
export const TENANT_GENERAL_KEYS = TenantGeneralSettingKeySchema.options;
