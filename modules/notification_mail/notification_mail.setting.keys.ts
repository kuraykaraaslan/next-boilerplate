import { z } from 'zod';

// ============================================================================
// Email Setting Keys (System-level SMTP configuration)
// ============================================================================

export const EmailSettingKeySchema = z.enum([
  'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'smtpEncryption',
  'fromEmail', 'fromName',
]);
export type EmailSettingKey = z.infer<typeof EmailSettingKeySchema>;
export const EMAIL_KEYS = EmailSettingKeySchema.options;

// ============================================================================
// Notification Setting Keys (System-level notification configuration)
// ============================================================================

export const NotificationSettingKeySchema = z.enum([
  'pushNotificationsEnabled', 'vapidPublicKey', 'vapidPrivateKey',
  'emailOnNewUser', 'emailOnNewComment', 'emailOnNewOrder', 'emailOnNewContact',
  'slackWebhookUrl', 'slackNotificationsEnabled',
  'adminNotificationEmail',
]);
export type NotificationSettingKey = z.infer<typeof NotificationSettingKeySchema>;
export const NOTIFICATION_KEYS = NotificationSettingKeySchema.options;
