import { z } from 'zod';

// ============================================================================
// Re-export from tenant.settings for backwards compatibility
// ============================================================================

export type {
  TenantSettingsState,
  TenantSettingsTabProps,
} from './tenant.settings';

// ============================================================================
// Re-export tenant setting keys from their respective modules
// ============================================================================

export {
  TenantGeneralSettingKeySchema,
  TENANT_GENERAL_KEYS,
  type TenantGeneralSettingKey,
} from '@/modules/tenant/tenant.setting.keys';

export {
  TenantBrandingSettingKeySchema,
  TENANT_BRANDING_KEYS,
  type TenantBrandingSettingKey,
} from '@/modules/tenant_branding/tenant_branding.setting.keys';

export {
  TenantSecuritySettingKeySchema,
  TENANT_SECURITY_KEYS,
  type TenantSecuritySettingKey,
} from '@/modules/tenant_session/tenant_session.setting.keys';

export {
  TenantBillingSettingKeySchema,
  TENANT_BILLING_KEYS,
  type TenantBillingSettingKey,
} from '@/modules/payment/payment.setting.keys';

// ============================================================================
// Tenant Feature Setting Keys
// ============================================================================

export const TenantFeatureSettingKeySchema = z.enum([
  'featureChat', 'featureNotifications', 'featureAnalytics',
  'featureExport', 'featureImport', 'featureApi',
  'featureWebhooks', 'featureCustomFields',
]);
export type TenantFeatureSettingKey = z.infer<typeof TenantFeatureSettingKeySchema>;
export const TENANT_FEATURE_KEYS = TenantFeatureSettingKeySchema.options;

// ============================================================================
// Tenant Notification Setting Keys
// ============================================================================

export const TenantNotificationSettingKeySchema = z.enum([
  'notifyNewUser', 'notifyNewOrder', 'notifyLowStock',
  'notifySystemAlert', 'notifyWeeklyReport',
  'emailNotifications', 'pushNotifications', 'smsNotifications',
]);
export type TenantNotificationSettingKey = z.infer<typeof TenantNotificationSettingKeySchema>;
export const TENANT_NOTIFICATION_KEYS = TenantNotificationSettingKeySchema.options;

// ============================================================================
// Tenant Integration Setting Keys
// ============================================================================

export const TenantIntegrationSettingKeySchema = z.enum([
  'slackWebhookUrl', 'slackChannel',
  'discordWebhookUrl', 'teamsWebhookUrl',
  'zapierEnabled', 'webhookUrl', 'apiEnabled',
]);
export type TenantIntegrationSettingKey = z.infer<typeof TenantIntegrationSettingKeySchema>;
export const TENANT_INTEGRATION_KEYS = TenantIntegrationSettingKeySchema.options;
