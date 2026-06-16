import { env } from '@nb/env';
import Logger from '@nb/logger';
import SettingService from '@nb/setting/server/setting.service';
import ejs from 'ejs';
import path from 'path';
import BaseMailProvider from './providers/base.provider';
import SMTPProvider from './providers/smtp.provider';
import SendGridProvider from './providers/sendgrid.provider';
import MailgunProvider from './providers/mailgun.provider';
import SESProvider from './providers/ses.provider';
import PostmarkProvider from './providers/postmark.provider';
import ResendProvider from './providers/resend.provider';

export type MailProviderType = 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend';

export default class NotificationMailProviderService {

  private static readonly smtpProvider      = new SMTPProvider();
  private static readonly sendgridProvider  = new SendGridProvider();
  private static readonly mailgunProvider   = new MailgunProvider();
  private static readonly sesProvider       = new SESProvider();
  private static readonly postmarkProvider  = new PostmarkProvider();
  private static readonly resendProvider    = new ResendProvider();

  static readonly PROVIDER_MAP = new Map<MailProviderType, BaseMailProvider>([
    ['smtp', NotificationMailProviderService.smtpProvider],
    ['sendgrid', NotificationMailProviderService.sendgridProvider],
    ['mailgun', NotificationMailProviderService.mailgunProvider],
    ['ses', NotificationMailProviderService.sesProvider],
    ['postmark', NotificationMailProviderService.postmarkProvider],
    ['resend', NotificationMailProviderService.resendProvider],
  ]);

  static readonly DEFAULT_PROVIDER: MailProviderType =
    (env.MAIL_PROVIDER as MailProviderType) || 'smtp';

  static readonly TEMPLATE_PATH = path.join(__dirname, 'templates');

  /** Resolve the tenant's preferred sender identity (falls back to env MAIL_FROM). */
  static async resolveFrom(tenantId: string): Promise<string> {
    try {
      const s = await SettingService.getByKeys(tenantId, ['fromEmail', 'fromName']);
      if (s.fromEmail) return s.fromName ? `${s.fromName} <${s.fromEmail}>` : s.fromEmail;
    } catch { /* fall through to env default */ }
    return env.MAIL_FROM || `${env.APPLICATION_NAME || 'Next Boilerplate'} <noreply@example.com>`;
  }

  static async getProvider(tenantId: string, providerName?: MailProviderType): Promise<BaseMailProvider> {
    // Per-tenant provider selection: honour the `mailProvider` setting when the
    // caller did not pin a provider explicitly.
    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'mailProvider').catch(() => null);
      name = (configured as MailProviderType) || NotificationMailProviderService.DEFAULT_PROVIDER;
    }
    const provider = NotificationMailProviderService.PROVIDER_MAP.get(name);
    if (!provider) {
      Logger.warn(`NotificationMailProviderService: Unknown provider "${name}", falling back to SMTP`);
      return NotificationMailProviderService.smtpProvider;
    }
    if (!(await provider.isConfigured(tenantId))) {
      Logger.warn(`NotificationMailProviderService: Provider "${name}" not configured for tenant ${tenantId}, trying fallback`);
      for (const [, p] of NotificationMailProviderService.PROVIDER_MAP) {
        if (await p.isConfigured(tenantId)) {
          Logger.info(`NotificationMailProviderService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
    }
    return provider;
  }

  static async listProviders(tenantId: string): Promise<{ name: MailProviderType; configured: boolean }[]> {
    const result: { name: MailProviderType; configured: boolean }[] = [];
    for (const [name, provider] of NotificationMailProviderService.PROVIDER_MAP) {
      result.push({ name, configured: await provider.isConfigured(tenantId) });
    }
    return result;
  }

  static async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<string> {
    const templatePath = path.join(NotificationMailProviderService.TEMPLATE_PATH, templateName);
    const body = await ejs.renderFile(templatePath, data, { async: true });
    const headerPath = path.join(NotificationMailProviderService.TEMPLATE_PATH, 'partials', 'email_header.ejs');
    const footerPath = path.join(NotificationMailProviderService.TEMPLATE_PATH, 'partials', 'email_footer.ejs');
    const headerHtml = await ejs.renderFile(headerPath, data, { async: true });
    const footerHtml = await ejs.renderFile(footerPath, data, { async: true });
    const layoutPath = path.join(NotificationMailProviderService.TEMPLATE_PATH, 'layouts', 'email_layout.ejs');
    return ejs.renderFile(layoutPath, { ...data, body, headerHtml, footerHtml }, { async: true });
  }
}
