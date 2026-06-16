import { env } from '@nb/env';
import Logger from '@nb/logger';
import SettingService from '@nb/setting/server/setting.service';
import { extensionRegistry } from '@nb/common/server/extension-registry';
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next';
import ejs from 'ejs';
import path from 'path';
import type BaseMailProvider from './providers/base.provider';

export type MailProviderType = 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'postmark' | 'resend';

/** Extension point satellite mail-provider modules contribute into. */
const MAIL_PROVIDER_POINT = 'mail:provider';

export default class NotificationMailProviderService {

  static readonly DEFAULT_PROVIDER: MailProviderType =
    (env.MAIL_PROVIDER as MailProviderType) || 'smtp';

  static readonly TEMPLATE_PATH = path.join(__dirname, 'templates');

  /** Enabled mail-provider contributions for a tenant. */
  private static async contributions(tenantId: string) {
    const enabledIds = await getEnabledModuleIds(tenantId);
    return extensionRegistry.getContributions(MAIL_PROVIDER_POINT, { enabledIds });
  }

  /** Resolve the tenant's preferred sender identity (falls back to env MAIL_FROM). */
  static async resolveFrom(tenantId: string): Promise<string> {
    try {
      const s = await SettingService.getByKeys(tenantId, ['fromEmail', 'fromName']);
      if (s.fromEmail) return s.fromName ? `${s.fromName} <${s.fromEmail}>` : s.fromEmail;
    } catch { /* fall through to env default */ }
    return env.MAIL_FROM || `${env.APPLICATION_NAME || 'Next Boilerplate'} <noreply@example.com>`;
  }

  static async getProvider(tenantId: string, providerName?: MailProviderType): Promise<BaseMailProvider> {
    const contribs = await NotificationMailProviderService.contributions(tenantId);
    if (contribs.length === 0) {
      throw new Error('No mail provider module is enabled for this tenant');
    }

    // Per-tenant provider selection: honour the `mailProvider` setting when the
    // caller did not pin a provider explicitly.
    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'mailProvider').catch(() => null);
      name = (configured as MailProviderType) || NotificationMailProviderService.DEFAULT_PROVIDER;
    }

    const keyOf = (c: { key: string | null; metadata: Record<string, unknown> }) => c.key ?? (c.metadata?.key as string);
    const firstConfigured = async (): Promise<BaseMailProvider | undefined> => {
      for (const c of contribs) {
        const p = await extensionRegistry.load<BaseMailProvider>(c);
        if (await p.isConfigured(tenantId)) {
          Logger.info(`NotificationMailProviderService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
      return undefined;
    };

    const chosen = contribs.find((c) => keyOf(c) === name);
    if (!chosen) {
      Logger.warn(`NotificationMailProviderService: provider "${name}" is unknown/disabled, falling back`);
      return (await firstConfigured()) ?? extensionRegistry.load<BaseMailProvider>(contribs[0]);
    }

    const provider = await extensionRegistry.load<BaseMailProvider>(chosen);
    if (!(await provider.isConfigured(tenantId))) {
      Logger.warn(`NotificationMailProviderService: provider "${name}" not configured for tenant ${tenantId}, trying fallback`);
      return (await firstConfigured()) ?? provider;
    }
    return provider;
  }

  static async listProviders(tenantId: string): Promise<{ name: MailProviderType; configured: boolean }[]> {
    const contribs = await NotificationMailProviderService.contributions(tenantId);
    const result: { name: MailProviderType; configured: boolean }[] = [];
    for (const c of contribs) {
      const name = (c.key ?? (c.metadata?.key as string)) as MailProviderType;
      const provider = await extensionRegistry.load<BaseMailProvider>(c);
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
