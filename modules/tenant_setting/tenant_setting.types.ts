import { z } from 'zod';

// ============================================================================
// Tenant Setting Schema
// ============================================================================

export const TenantSettingSchema = z.object({
  tenantSettingId: z.string().uuid(),
  tenantId: z.string().uuid(),
  key: z.string(),
  value: z.string(),
  group: z.string().default("general"),
  type: z.string().default("string"),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export type TenantSetting = z.infer<typeof TenantSettingSchema>;

// ============================================================================
// Tenant Setting Key Schemas by Group
// ============================================================================

export const TenantGeneralSettingKeySchema = z.enum([
  'tenantName', 'tenantDescription', 'logoUrl', 'faviconUrl',
  'primaryColor', 'secondaryColor', 'accentColor',
  'contactEmail', 'contactPhone', 'contactAddress',
  'timezone', 'language', 'dateFormat', 'timeFormat',
]);
export type TenantGeneralSettingKey = z.infer<typeof TenantGeneralSettingKeySchema>;
export const TENANT_GENERAL_KEYS = TenantGeneralSettingKeySchema.options;

export const TenantBrandingSettingKeySchema = z.enum([
  'brandName', 'brandTagline', 'brandLogoLight', 'brandLogoDark',
  'brandFavicon', 'brandPrimaryColor', 'brandSecondaryColor',
  'customCss', 'customJs',
]);
export type TenantBrandingSettingKey = z.infer<typeof TenantBrandingSettingKeySchema>;
export const TENANT_BRANDING_KEYS = TenantBrandingSettingKeySchema.options;

export const TenantFeatureSettingKeySchema = z.enum([
  'featureChat', 'featureNotifications', 'featureAnalytics',
  'featureExport', 'featureImport', 'featureApi',
  'featureWebhooks', 'featureIntegrations',
  'maxUsers', 'maxStorage', 'maxProjects',
]);
export type TenantFeatureSettingKey = z.infer<typeof TenantFeatureSettingKeySchema>;
export const TENANT_FEATURE_KEYS = TenantFeatureSettingKeySchema.options;

export const TenantNotificationSettingKeySchema = z.enum([
  'emailNotifications', 'pushNotifications', 'smsNotifications',
  'notifyOnNewMember', 'notifyOnMemberLeft', 'notifyOnRoleChange',
  'digestFrequency', 'quietHoursStart', 'quietHoursEnd',
]);
export type TenantNotificationSettingKey = z.infer<typeof TenantNotificationSettingKeySchema>;
export const TENANT_NOTIFICATION_KEYS = TenantNotificationSettingKeySchema.options;

export const TenantSecuritySettingKeySchema = z.enum([
  'twoFactorRequired', 'passwordMinLength', 'passwordRequireUppercase',
  'passwordRequireNumbers', 'passwordRequireSymbols',
  'sessionTimeout', 'maxLoginAttempts', 'ipWhitelist', 'ipBlacklist',
  'ssoEnabled', 'ssoProvider', 'ssoConfig',
]);
export type TenantSecuritySettingKey = z.infer<typeof TenantSecuritySettingKeySchema>;
export const TENANT_SECURITY_KEYS = TenantSecuritySettingKeySchema.options;

export const TenantBillingSettingKeySchema = z.enum([
  'billingEmail', 'billingName', 'billingAddress',
  'taxId', 'vatNumber', 'currency',
  'invoicePrefix', 'invoiceFooter',
]);
export type TenantBillingSettingKey = z.infer<typeof TenantBillingSettingKeySchema>;
export const TENANT_BILLING_KEYS = TenantBillingSettingKeySchema.options;

export const TenantIntegrationSettingKeySchema = z.enum([
  'slackWebhookUrl', 'discordWebhookUrl', 'teamsWebhookUrl',
  'jiraEnabled', 'jiraUrl', 'jiraApiToken',
  'githubEnabled', 'githubToken',
  'googleCalendarEnabled', 'googleCalendarId',
]);
export type TenantIntegrationSettingKey = z.infer<typeof TenantIntegrationSettingKeySchema>;
export const TENANT_INTEGRATION_KEYS = TenantIntegrationSettingKeySchema.options;

// ============================================================================
// Tenant Settings State (for frontend)
// ============================================================================


export interface TenantSettingsTabProps {
    settings: TenantSettingsState;
    setSettings: React.Dispatch<React.SetStateAction<TenantSettingsState>>;
    loading: boolean;
    saving: boolean;
    error: string | null;
    isDirty: boolean;
    saveSettings: () => Promise<void>;
}

export const TenantSettingsStateSchema = z.record(z.string(), z.string());
export type TenantSettingsState = z.infer<typeof TenantSettingsStateSchema>;
