import { z } from 'zod';

// ============================================================================
// Constants
// ============================================================================

export const SYSTEM_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// ============================================================================
// Setting Schema
// ============================================================================

export const SettingSchema = z.object({
  tenantId: z.string().uuid().default(SYSTEM_TENANT_ID),
  key: z.string(),
  value: z.string(),
  group: z.string().default("general"),
  type: z.string().default("string"),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
});

export type Setting = z.infer<typeof SettingSchema>;

// ============================================================================
// Setting Key Schemas by Group
// ============================================================================

// Re-export from auth module
export {
  GeneralSettingKeySchema,
  GENERAL_KEYS,
  AuthSettingKeySchema,
  AUTH_KEYS,
} from '@/modules/auth/auth.setting.keys';

export type {
  GeneralSettingKey,
  AuthSettingKey,
} from '@/modules/auth/auth.setting.keys';

// Re-export from notification_mail module
export {
  EmailSettingKeySchema,
  EMAIL_KEYS,
  NotificationSettingKeySchema,
  NOTIFICATION_KEYS,
} from '@/modules/notification_mail/notification_mail.setting.keys';

export type {
  EmailSettingKey,
  NotificationSettingKey,
} from '@/modules/notification_mail/notification_mail.setting.keys';

// Re-export from notification_sms module
export {
  SmsSettingKeySchema,
  SMS_KEYS,
} from '@/modules/notification_sms/notification_sms.setting.keys';

export type {
  SmsSettingKey,
} from '@/modules/notification_sms/notification_sms.setting.keys';

// Re-export from storage module
export {
  StorageSettingKeySchema,
  STORAGE_KEYS,
} from '@/modules/storage/storage.setting.keys';

export type {
  StorageSettingKey,
} from '@/modules/storage/storage.setting.keys';

// Re-export from ai module
export {
  AiSettingKeySchema,
  AI_KEYS,
} from '@/modules/ai/ai.setting.keys';

export type {
  AiSettingKey,
} from '@/modules/ai/ai.setting.keys';

// Re-export from user_security module
export {
  SecuritySettingKeySchema,
  SECURITY_KEYS,
} from '@/modules/user_security/user_security.setting.keys';

export type {
  SecuritySettingKey,
} from '@/modules/user_security/user_security.setting.keys';

// Re-export from payment module
export {
  PaymentSettingKeySchema,
  PAYMENT_KEYS,
} from '@/modules/payment/payment.setting.keys';

export type {
  PaymentSettingKey,
} from '@/modules/payment/payment.setting.keys';

// Re-export from tenant_subscription module
export {
  SubscriptionSettingKeySchema,
  SUBSCRIPTION_KEYS,
} from '@/modules/tenant_subscription/tenant_subscription.setting.keys';

export type {
  SubscriptionSettingKey,
} from '@/modules/tenant_subscription/tenant_subscription.setting.keys';

export const IntegrationsSettingKeySchema = z.enum([
  'discordWebhookUrl', 'discordDoormanWebhookUrl',
  'githubTreeUrl', 'githubToken', 'githubUser',
]);
export type IntegrationsSettingKey = z.infer<typeof IntegrationsSettingKeySchema>;
export const INTEGRATIONS_KEYS = IntegrationsSettingKeySchema.options;

export const AnalyticsSettingKeySchema = z.enum([
  'googleTagId',
]);
export type AnalyticsSettingKey = z.infer<typeof AnalyticsSettingKeySchema>;
export const ANALYTICS_KEYS = AnalyticsSettingKeySchema.options;

export const SeoSettingKeySchema = z.enum([
  'metaRobots', 'sitemapEnabled', 'canonicalEnabled',
  'ogDefaultImage', 'twitterCardType',
  'googleSearchConsoleId', 'bingWebmasterId',
]);
export type SeoSettingKey = z.infer<typeof SeoSettingKeySchema>;
export const SEO_KEYS = SeoSettingKeySchema.options;

export const SocialSettingKeySchema = z.enum([
  'facebookUrl', 'twitterUrl', 'instagramUrl', 'linkedinUrl', 'youtubeUrl',
  'githubProfileUrl', 'tiktokUrl', 'pinterestUrl',
]);
export type SocialSettingKey = z.infer<typeof SocialSettingKeySchema>;
export const SOCIAL_KEYS = SocialSettingKeySchema.options;

export const LocalizationSettingKeySchema = z.enum([
  'defaultTimezone', 'defaultLanguage',
  'dateFormat', 'timeFormat', 'datetimeFormat',
  'weekStartsOn', 'currencySymbol', 'currencyPosition',
  'thousandSeparator', 'decimalSeparator',
]);
export type LocalizationSettingKey = z.infer<typeof LocalizationSettingKeySchema>;
export const LOCALIZATION_KEYS = LocalizationSettingKeySchema.options;

// ============================================================================
// Settings State
// ============================================================================

export const SettingsStateSchema = z.record(z.string(), z.string());
export type SettingsState = z.infer<typeof SettingsStateSchema>;

