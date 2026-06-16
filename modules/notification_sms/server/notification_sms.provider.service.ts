import { env } from '@nb/env';
import Logger from '@nb/logger';
import SettingService from '@nb/setting/server/setting.service';
import { extensionRegistry } from '@nb/common/server/extension-registry';
import { getEnabledModuleIds } from '@nb/setting/server/module-activation.service.next';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import type BaseSMSProvider from './providers/base.provider';

export type SMSProviderType = 'twilio' | 'netgsm' | 'clickatell' | 'nexmo';

/** Extension point satellite SMS-provider modules contribute into. */
const SMS_PROVIDER_POINT = 'sms:provider';

export default class NotificationSmsProviderService {

  static readonly phoneLibInstance = PhoneNumberUtil.getInstance();
  static readonly ALLOWED_COUNTRIES = env.SMS_ALLOWED_COUNTRIES?.split(',').map((c) => c.trim());

  static readonly DEFAULT_PROVIDER_NAME: SMSProviderType =
    (env.SMS_DEFAULT_PROVIDER as SMSProviderType) || 'twilio';

  /** Enabled SMS-provider contributions for a tenant. */
  private static async contributions(tenantId: string) {
    const enabledIds = await getEnabledModuleIds(tenantId);
    return extensionRegistry.getContributions(SMS_PROVIDER_POINT, { enabledIds });
  }

  static readonly REGION_PROVIDER_MAP: Map<string, SMSProviderType> =
    NotificationSmsProviderService.buildRegionProviderMap();

  private static buildRegionProviderMap(): Map<string, SMSProviderType> {
    const map = new Map<string, SMSProviderType>();
    const envMap = env.SMS_PROVIDER_MAP;
    if (envMap) {
      for (const pair of envMap.split(',').map((p) => p.trim())) {
        const [region, provider] = pair.split(':').map((s) => s.trim());
        if (region && provider && NotificationSmsProviderService.isValidProviderName(provider)) {
          map.set(region.toUpperCase(), provider as SMSProviderType);
        }
      }
    } else {
      map.set('TR', 'netgsm');
      map.set('US', 'twilio');
      map.set('GB', 'twilio');
      map.set('DE', 'twilio');
      map.set('FR', 'twilio');
    }
    return map;
  }

  private static isValidProviderName(name: string): boolean {
    return ['twilio', 'netgsm', 'clickatell', 'nexmo'].includes(name.toLowerCase());
  }

  static async getProvider(tenantId: string, providerName?: SMSProviderType): Promise<BaseSMSProvider> {
    const contribs = await NotificationSmsProviderService.contributions(tenantId);
    if (contribs.length === 0) {
      throw new Error('No SMS provider module is enabled for this tenant');
    }

    // Per-tenant provider selection: honour the `smsProvider` setting unless the
    // caller pinned a provider explicitly.
    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'smsProvider').catch(() => null);
      name = (configured && NotificationSmsProviderService.isValidProviderName(configured) ? configured as SMSProviderType : null)
        || NotificationSmsProviderService.DEFAULT_PROVIDER_NAME;
    }

    const keyOf = (c: { key: string | null; metadata: Record<string, unknown> }) => c.key ?? (c.metadata?.key as string);
    const firstConfigured = async (): Promise<BaseSMSProvider | undefined> => {
      for (const c of contribs) {
        const p = await extensionRegistry.load<BaseSMSProvider>(c);
        if (await p.isConfigured(tenantId)) {
          Logger.info(`NotificationSmsProviderService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
      return undefined;
    };

    const chosen = contribs.find((c) => keyOf(c) === name);
    if (!chosen) {
      Logger.warn(`NotificationSmsProviderService: provider "${name}" is unknown/disabled, falling back`);
      return (await firstConfigured()) ?? extensionRegistry.load<BaseSMSProvider>(contribs[0]);
    }

    const provider = await extensionRegistry.load<BaseSMSProvider>(chosen);
    if (!(await provider.isConfigured(tenantId))) {
      Logger.warn(`NotificationSmsProviderService: provider "${name}" not configured for tenant ${tenantId}, trying fallback`);
      return (await firstConfigured()) ?? provider;
    }
    return provider;
  }

  static async listProviders(tenantId: string): Promise<{ name: SMSProviderType; configured: boolean }[]> {
    const contribs = await NotificationSmsProviderService.contributions(tenantId);
    const result: { name: SMSProviderType; configured: boolean }[] = [];
    for (const c of contribs) {
      const name = (c.key ?? (c.metadata?.key as string)) as SMSProviderType;
      const provider = await extensionRegistry.load<BaseSMSProvider>(c);
      result.push({ name, configured: await provider.isConfigured(tenantId) });
    }
    return result;
  }

  static getRegionProviderMap(): Record<string, SMSProviderType> {
    const result: Record<string, SMSProviderType> = {};
    for (const [region, provider] of NotificationSmsProviderService.REGION_PROVIDER_MAP) {
      result[region] = provider;
    }
    return result;
  }

  static async getProviderForRegion(tenantId: string, regionCode: string): Promise<BaseSMSProvider> {
    // Per-tenant region→provider override takes precedence over the global map.
    try {
      const { default: NotificationSmsDeliveryService } = await import('./notification_sms.delivery.service');
      const override = await NotificationSmsDeliveryService.resolveRegionProvider(tenantId, regionCode);
      if (override && NotificationSmsProviderService.isValidProviderName(override)) {
        return NotificationSmsProviderService.getProvider(tenantId, override as SMSProviderType);
      }
    } catch { /* fall through to global map */ }

    const providerName = NotificationSmsProviderService.REGION_PROVIDER_MAP.get(regionCode.toUpperCase());
    if (providerName) {
      return NotificationSmsProviderService.getProvider(tenantId, providerName);
    }
    Logger.warn(`NotificationSmsProviderService: No specific provider for ${regionCode}. Using default.`);
    return NotificationSmsProviderService.getProvider(tenantId);
  }

  static parsePhoneNumber(phoneNumber: string): { number: string; regionCode: string } | null {
    try {
      const parsed = NotificationSmsProviderService.phoneLibInstance.parse(phoneNumber);
      const regionCode = NotificationSmsProviderService.phoneLibInstance.getRegionCodeForNumber(parsed);
      if (!regionCode) {
        Logger.error(`NotificationSmsProviderService: Unable to get region code for number: ${phoneNumber}`);
        return null;
      }
      const number = NotificationSmsProviderService.phoneLibInstance.format(parsed, PhoneNumberFormat.E164);
      return { number, regionCode };
    } catch (error) {
      Logger.error(`NotificationSmsProviderService: Error parsing phone number ${phoneNumber}: ${error}`);
      return null;
    }
  }

  static isAllowedCountry(regionCode: string): boolean {
    const allowed = NotificationSmsProviderService.ALLOWED_COUNTRIES;
    if (!allowed || allowed.length === 0) return true;
    return allowed.includes(regionCode);
  }

  /**
   * Per-tenant country allowlist (`smsAllowedCountries`, CSV of ISO-2 codes).
   * Falls back to the platform `ALLOWED_COUNTRIES` env list when unset.
   */
  static async isAllowedCountryForTenant(tenantId: string, regionCode: string): Promise<boolean> {
    const raw = await SettingService.getValue(tenantId, 'smsAllowedCountries').catch(() => null);
    if (raw) {
      const list = raw.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
      if (list.length > 0) return list.includes(regionCode.toUpperCase());
    }
    return NotificationSmsProviderService.isAllowedCountry(regionCode);
  }

  static isValidPhoneNumber(phoneNumber: string): boolean {
    try {
      const parsed = NotificationSmsProviderService.phoneLibInstance.parse(phoneNumber);
      return NotificationSmsProviderService.phoneLibInstance.isValidNumber(parsed);
    } catch {
      return false;
    }
  }
}
