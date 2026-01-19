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

export default abstract class BaseMailProvider {
  abstract readonly name: string;

  abstract sendMail(options: MailOptions): Promise<MailResult>;

  /**
   * Check if the provider is properly configured
   */
  abstract isConfigured(): boolean;
}
