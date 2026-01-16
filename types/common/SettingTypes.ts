
import { z } from 'zod';

// ==================== Setting Key Schemas ====================

export const GeneralSettingKeySchema = z.enum([
  'siteName', 'siteUrl', 'siteDescription', 'logoUrl', 'faviconUrl',
  'applicationHost', 'applicationDomain', 'i18nLanguages',
  'contactName', 'contactTitle', 'contactEmail', 'contactPhone',
  'maintenanceMode', 'maintenanceMessage',
]);
export type GeneralSettingKey = z.infer<typeof GeneralSettingKeySchema>;
export const GENERAL_KEYS = GeneralSettingKeySchema.options;

export const AuthSettingKeySchema = z.enum([
  'allowRegistration', 'emailVerificationRequired', 'sessionDuration', 'maxLoginAttempts',
  'ssoAllowedProviders',
  // JWT
  'jwtAccessTokenSecret', 'jwtAccessTokenExpiresIn', 'jwtRefreshTokenSecret', 'jwtRefreshTokenExpiresIn',
  // OAuth Providers - Enabled flags
  'oauthGoogle', 'oauthGitHub', 'oauthMicrosoft', 'oauthLinkedIn', 'oauthApple', 'oauthTwitter', 'oauthMeta', 'oauthAutodesk',
  // Google OAuth
  'googleClientId', 'googleClientSecret',
  // GitHub OAuth
  'githubClientId', 'githubClientSecret',
  // Apple OAuth
  'appleClientId', 'appleTeamId', 'appleKeyId', 'applePrivateKey',
  // Meta (Facebook) OAuth
  'metaClientId', 'metaClientSecret',
  // Autodesk OAuth
  'autodeskClientId', 'autodeskClientSecret',
  // GitLab OAuth
  'gitlabToken', 'gitlabUser',
]);
export type AuthSettingKey = z.infer<typeof AuthSettingKeySchema>;
export const AUTH_KEYS = AuthSettingKeySchema.options;

export const EmailSettingKeySchema = z.enum([
  'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'smtpEncryption',
  'fromEmail', 'fromName',
]);
export type EmailSettingKey = z.infer<typeof EmailSettingKeySchema>;
export const EMAIL_KEYS = EmailSettingKeySchema.options;

export const SmsSettingKeySchema = z.enum([
  'smsProvider', 'smsEnabled',
  // Twilio
  'twilioAccountSid', 'twilioAuthToken', 'twilioPhoneNumber',
  // NetGSM
  'netgsmUserCode', 'netgsmPassword', 'netgsmPhoneNumber',
]);
export type SmsSettingKey = z.infer<typeof SmsSettingKeySchema>;
export const SMS_KEYS = SmsSettingKeySchema.options;

export const StorageSettingKeySchema = z.enum([
  'storageProvider', 's3Bucket', 's3Region', 's3AccessKey', 's3SecretKey', 's3Endpoint',
  'maxFileSizeMb', 'allowedExtensions',
]);
export type StorageSettingKey = z.infer<typeof StorageSettingKeySchema>;
export const STORAGE_KEYS = StorageSettingKeySchema.options;

export const AiSettingKeySchema = z.enum([
  'aiEnabled', 'aiDailyLimit', 'aiMonthlyBudget',
  // OpenAI
  'openaiApiKey', 'openaiDefaultModel', 'openaiMaxTokens',
  // Anthropic
  'anthropicApiKey', 'anthropicDefaultModel',
  // HuggingFace
  'huggingfaceToken',
  // TinyMCE
  'tinymceApiKey',
]);
export type AiSettingKey = z.infer<typeof AiSettingKeySchema>;
export const AI_KEYS = AiSettingKeySchema.options;

export const SecuritySettingKeySchema = z.enum([
  'rateLimitPerMinute', 'rateLimitPerHour', 'rateLimitEnabled',
  'corsAllowedOrigins', 'hstsEnabled', 'xContentTypeOptions', 'xFrameOptions', 'blockedIps',
  // Recaptcha
  'recaptchaEnabled', 'recaptchaClientKey', 'recaptchaServerKey',
  // MaxMind GeoIP
  'maxmindAccountId', 'maxmindApiKey',
  // Cron
  'cronSecret',
]);
export type SecuritySettingKey = z.infer<typeof SecuritySettingKeySchema>;
export const SECURITY_KEYS = SecuritySettingKeySchema.options;

export const IntegrationsSettingKeySchema = z.enum([
  // Discord
  'discordWebhookUrl', 'discordDoormanWebhookUrl',
  // GitHub Widgets
  'githubTreeUrl', 'githubToken', 'githubUser',
]);
export type IntegrationsSettingKey = z.infer<typeof IntegrationsSettingKeySchema>;
export const INTEGRATIONS_KEYS = IntegrationsSettingKeySchema.options;

export const AnalyticsSettingKeySchema = z.enum([
  // Google Analytics
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

export const PaymentSettingKeySchema = z.enum([
  // Stripe
  'stripeEnabled', 'stripePublicKey', 'stripeSecretKey', 'stripeWebhookSecret',
  // PayPal
  'paypalEnabled', 'paypalClientId', 'paypalClientSecret', 'paypalSandboxMode',
  // iyzico (Turkey)
  'iyzicoEnabled', 'iyzicoApiKey', 'iyzicoSecretKey', 'iyzicoSandboxMode',
  // General
  'currency', 'taxRate', 'taxEnabled',
]);
export type PaymentSettingKey = z.infer<typeof PaymentSettingKeySchema>;
export const PAYMENT_KEYS = PaymentSettingKeySchema.options;

export const NotificationSettingKeySchema = z.enum([
  // Push Notifications
  'pushNotificationsEnabled', 'vapidPublicKey', 'vapidPrivateKey',
  // Email Notifications
  'emailOnNewUser', 'emailOnNewComment', 'emailOnNewOrder', 'emailOnNewContact',
  // Slack
  'slackWebhookUrl', 'slackNotificationsEnabled',
  // Admin Notification Email
  'adminNotificationEmail',
]);
export type NotificationSettingKey = z.infer<typeof NotificationSettingKeySchema>;
export const NOTIFICATION_KEYS = NotificationSettingKeySchema.options;

export const LocalizationSettingKeySchema = z.enum([
  'defaultTimezone', 'defaultLanguage',
  'dateFormat', 'timeFormat', 'datetimeFormat',
  'weekStartsOn', 'currencySymbol', 'currencyPosition',
  'thousandSeparator', 'decimalSeparator',
]);
export type LocalizationSettingKey = z.infer<typeof LocalizationSettingKeySchema>;
export const LOCALIZATION_KEYS = LocalizationSettingKeySchema.options;

// ==================== Setting Model Schema ====================

export const SettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  group: z.string().default("general"),
  type: z.string().default("string"),
});
export type Setting = z.infer<typeof SettingSchema>;

// ==================== Settings State & Tab Props ====================

export const SettingsStateSchema = z.record(z.string(), z.string());
export type SettingsState = z.infer<typeof SettingsStateSchema>;

export interface SettingsTabProps {
  settings: SettingsState;
  setSettings: React.Dispatch<React.SetStateAction<SettingsState>>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  isDirty: boolean;
  saveSettings: () => Promise<void>;
}
