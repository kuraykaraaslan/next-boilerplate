import { z } from 'zod';
import { ROOT_TENANT_ID } from '@nb/tenant/server/tenant.constants';

// ============================================================================
// Setting Schema
// ============================================================================

export const SettingSchema = z.object({
  tenantId: z.string().uuid().default(ROOT_TENANT_ID),
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
} from '@nb/auth/server/auth.setting.keys';

export type {
  GeneralSettingKey,
  AuthSettingKey,
} from '@nb/auth/server/auth.setting.keys';

// Re-export from notification_mail module
export {
  EmailSettingKeySchema,
  EMAIL_KEYS,
  NotificationSettingKeySchema,
  NOTIFICATION_KEYS,
} from '@nb/notification_mail/server/notification_mail.setting.keys';

export type {
  EmailSettingKey,
  NotificationSettingKey,
} from '@nb/notification_mail/server/notification_mail.setting.keys';

// Re-export from notification_sms module
export {
  SmsSettingKeySchema,
  SMS_KEYS,
} from '@nb/notification_sms/server/notification_sms.setting.keys';

export type {
  SmsSettingKey,
} from '@nb/notification_sms/server/notification_sms.setting.keys';

// Re-export from storage module
export {
  StorageSettingKeySchema,
  STORAGE_KEYS,
} from '@nb/storage/server/storage.setting.keys';

export type {
  StorageSettingKey,
} from '@nb/storage/server/storage.setting.keys';

// Re-export from ai module
export {
  AiSettingKeySchema,
  AI_KEYS,
} from '@nb/ai/server/ai.setting.keys';

export type {
  AiSettingKey,
} from '@nb/ai/server/ai.setting.keys';

// Re-export from user_security module
export {
  SecuritySettingKeySchema,
  SECURITY_KEYS,
} from '@nb/user_security/server/user_security.setting.keys';

export type {
  SecuritySettingKey,
} from '@nb/user_security/server/user_security.setting.keys';

// Re-export from payment module
export {
  PaymentSettingKeySchema,
  PAYMENT_KEYS,
} from '@nb/payment/server/payment.setting.keys';

export type {
  PaymentSettingKey,
} from '@nb/payment/server/payment.setting.keys';

// Re-export from tenant_subscription module
export {
  SubscriptionSettingKeySchema,
  SUBSCRIPTION_KEYS,
} from '@nb/tenant_subscription/server/tenant_subscription.setting.keys';

export type {
  SubscriptionSettingKey,
} from '@nb/tenant_subscription/server/tenant_subscription.setting.keys';

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

