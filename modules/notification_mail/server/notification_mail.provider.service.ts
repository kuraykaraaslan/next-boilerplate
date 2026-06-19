import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { listExternalContributions, type ExternalContribution } from '@kuraykaraaslan/common/server/external-extensions';
import ejs from 'ejs';
import path from 'path';
import type BaseMailProvider from './providers/base.provider';
import { IsolatedMailProvider } from './providers/isolated.provider';

export type MailProviderType = 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend';

/** Extension point mail providers contribute into (sandboxed community plugins). */
const MAIL_PROVIDER_POINT = 'mail:provider';

export default class NotificationMailProviderService {

  static readonly DEFAULT_PROVIDER: MailProviderType =
    (env.MAIL_PROVIDER as MailProviderType) || 'smtp';

  static readonly TEMPLATE_PATH = path.join(__dirname, 'templates');

  /** Installed sandboxed community mail providers for a tenant. */
  private static async contributions(tenantId: string): Promise<ExternalContribution[]> {
    return listExternalContributions(tenantId, MAIL_PROVIDER_POINT);
  }

  private static build(c: ExternalContribution): BaseMailProvider {
    return new IsolatedMailProvider(c.key, c.metadata ?? {}, c.invoke, c.configured);
  }

  /** Resolve the tenant's preferred sender identity (falls back to env MAIL_FROM). */
  static async resolveFrom(tenantId: string): Promise<string> {
    try {
      const s = await SettingService.getByKeys(tenantId, ['fromEmail', 'fromName']);
      if (s.fromEmail) return s.fromName ? `${s.fromName} <${s.fromEmail}>` : s.fromEmail;
    } catch { /* fall through to env default */ }
    return env.MAIL_FROM || `${env.APPLICATION_NAME || 'Next Boilerplate'} <noreply@example.com>`;
  }

  /**
   * Resolve a provider for a tenant. Providers are SANDBOXED community plugins
   * resolved per-tenant via the external-contributions bridge — no in-tree built-in
   * fallback. Honours an explicit choice / the `mailProvider` setting, then falls
   * back to the first installed+configured provider.
   */
  static async getProvider(tenantId: string, providerName?: MailProviderType): Promise<BaseMailProvider> {
    const contribs = await NotificationMailProviderService.contributions(tenantId);
    if (contribs.length === 0) {
      throw new Error('No mail provider is installed for this tenant');
    }

    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'mailProvider').catch(() => null);
      name = (configured as MailProviderType) || NotificationMailProviderService.DEFAULT_PROVIDER;
    }

    const firstConfigured = (): BaseMailProvider | undefined => {
      const c = contribs.find((x) => x.configured);
      if (c) Logger.info(`NotificationMailProviderService: Using fallback provider "${c.key}"`);
      return c ? NotificationMailProviderService.build(c) : undefined;
    };

    const chosen = contribs.find((c) => c.key === name);
    if (!chosen) {
      Logger.warn(`NotificationMailProviderService: provider "${name}" is unknown/not installed, falling back`);
      return firstConfigured() ?? NotificationMailProviderService.build(contribs[0]);
    }
    if (!chosen.configured) {
      Logger.warn(`NotificationMailProviderService: provider "${name}" not configured for tenant ${tenantId}, trying fallback`);
      return firstConfigured() ?? NotificationMailProviderService.build(chosen);
    }
    return NotificationMailProviderService.build(chosen);
  }

  static async listProviders(tenantId: string): Promise<{ name: MailProviderType; configured: boolean }[]> {
    return (await NotificationMailProviderService.contributions(tenantId))
      .map((c) => ({ name: c.key as MailProviderType, configured: c.configured }));
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
