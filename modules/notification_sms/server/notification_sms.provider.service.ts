import { env } from '@kuraykaraaslan/env';
import Logger from '@kuraykaraaslan/logger';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import { listExternalContributions, type ExternalContribution } from '@kuraykaraaslan/common/server/external-extensions';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import type BaseSMSProvider from './providers/base.provider';
import { IsolatedSmsProvider } from './providers/isolated.provider';

export type SMSProviderType = 'twilio' | 'netgsm' | 'clickatell' | 'nexmo';

/** Extension point SMS providers contribute into (sandboxed community plugins). */
const SMS_PROVIDER_POINT = 'sms:provider';

export default class NotificationSmsProviderService {

  static readonly phoneLibInstance = PhoneNumberUtil.getInstance();
  static readonly ALLOWED_COUNTRIES = env.SMS_ALLOWED_COUNTRIES?.split(',').map((c) => c.trim());

  static readonly DEFAULT_PROVIDER_NAME: SMSProviderType =
    (env.SMS_DEFAULT_PROVIDER as SMSProviderType) || 'twilio';

  /** Installed sandboxed community SMS providers for a tenant. */
  private static async contributions(tenantId: string): Promise<ExternalContribution[]> {
    return listExternalContributions(tenantId, SMS_PROVIDER_POINT);
  }

  private static build(c: ExternalContribution): BaseSMSProvider {
    return new IsolatedSmsProvider(c.key, c.metadata ?? {}, c.invoke, c.configured);
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

  /**
   * Resolve a provider for a tenant. Providers are SANDBOXED community plugins
   * resolved per-tenant via the external-contributions bridge — no in-tree built-in
   * fallback. Honours an explicit choice / the `smsProvider` setting, then falls back
   * to the first installed+configured provider.
   */
  static async getProvider(tenantId: string, providerName?: SMSProviderType): Promise<BaseSMSProvider> {
    const contribs = await NotificationSmsProviderService.contributions(tenantId);
    if (contribs.length === 0) {
      throw new Error('No SMS provider is installed for this tenant');
    }

    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'smsProvider').catch(() => null);
      name = (configured && NotificationSmsProviderService.isValidProviderName(configured) ? configured as SMSProviderType : null)
        || NotificationSmsProviderService.DEFAULT_PROVIDER_NAME;
    }

    const firstConfigured = (): BaseSMSProvider | undefined => {
      const c = contribs.find((x) => x.configured);
      if (c) Logger.info(`NotificationSmsProviderService: Using fallback provider "${c.key}"`);
      return c ? NotificationSmsProviderService.build(c) : undefined;
    };

    const chosen = contribs.find((c) => c.key === name);
    if (!chosen) {
      Logger.warn(`NotificationSmsProviderService: provider "${name}" is unknown/not installed, falling back`);
      return firstConfigured() ?? NotificationSmsProviderService.build(contribs[0]);
    }
    if (!chosen.configured) {
      Logger.warn(`NotificationSmsProviderService: provider "${name}" not configured for tenant ${tenantId}, trying fallback`);
      return firstConfigured() ?? NotificationSmsProviderService.build(chosen);
    }
    return NotificationSmsProviderService.build(chosen);
  }

  static async listProviders(tenantId: string): Promise<{ name: SMSProviderType; configured: boolean }[]> {
    return (await NotificationSmsProviderService.contributions(tenantId))
      .map((c) => ({ name: c.key as SMSProviderType, configured: c.configured }));
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
