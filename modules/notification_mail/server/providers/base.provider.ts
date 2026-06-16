export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: MailAttachment[];
}

export interface MailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Tenant-aware mail provider contract.
 *
 * Every method takes the resolved `tenantId` as its first argument so each
 * tenant can store its own SMTP / SES / Mailgun / Postmark / Resend / SendGrid
 * credentials in its `settings` table. Providers fall back to `env.*` when a
 * tenant has not configured the matching key.
 */
export default abstract class BaseMailProvider {
  abstract readonly name: string;

  /** Send a mail using credentials resolved for the given tenant. */
  abstract sendMail(tenantId: string, options: MailOptions): Promise<MailResult>;

  /**
   * Whether the provider has the minimum credentials it needs for the given
   * tenant. Implementations consult SettingService(tenantId) first, then
   * `env.*` as a fallback.
   */
  abstract isConfigured(tenantId: string): Promise<boolean>;
}
