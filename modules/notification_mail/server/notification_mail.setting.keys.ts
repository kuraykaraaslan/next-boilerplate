import { z } from 'zod';

// ============================================================================
// Email Setting Keys (Tenant-scoped SMTP / provider configuration)
//
// Every key below is read per-tenant via SettingService.getValue(tenantId, ...).
// When a tenant has no value for a given key, the provider falls back to the
// matching `env.*` value so the platform keeps working out-of-the-box.
// ============================================================================

export const EmailSettingKeySchema = z.enum([
  // ── Routing / sender ─────────────────────────────────────────────────────
  'mailProvider', 'fromEmail', 'fromName',
  // ── SMTP ─────────────────────────────────────────────────────────────────
  'smtpHost', 'smtpPort', 'smtpUsername', 'smtpPassword', 'smtpEncryption', 'smtpSecure',
  // ── SendGrid ─────────────────────────────────────────────────────────────
  'sendgridApiKey',
  // ── Mailgun ──────────────────────────────────────────────────────────────
  'mailgunApiKey', 'mailgunDomain', 'mailgunRegion',
  // ── AWS SES ──────────────────────────────────────────────────────────────
  'awsSesAccessKeyId', 'awsSesSecretAccessKey', 'awsSesRegion',
  // ── Postmark ─────────────────────────────────────────────────────────────
  'postmarkApiKey',
  // ── Resend ───────────────────────────────────────────────────────────────
  'resendApiKey',
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
