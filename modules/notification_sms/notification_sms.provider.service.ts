import { env } from '@/modules/env';
import Logger from '@/modules/logger';
import SettingService from '@/modules/setting/setting.service';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import BaseSMSProvider from './providers/base.provider';
import TwilioProvider from './providers/twilio.provider';
import NetGSMProvider from './providers/netgsm.provider';
import ClickatellProvider from './providers/clickatell.provider';
import NexmoProvider from './providers/nexmo.provider';

export type SMSProviderType = 'twilio' | 'netgsm' | 'clickatell' | 'nexmo';

export default class NotificationSmsProviderService {

  static readonly phoneLibInstance = PhoneNumberUtil.getInstance();
  static readonly ALLOWED_COUNTRIES = env.SMS_ALLOWED_COUNTRIES?.split(',').map((c) => c.trim());

  private static readonly twilioProvider = new TwilioProvider();
  private static readonly netgsmProvider = new NetGSMProvider();
  private static readonly clickatellProvider = new ClickatellProvider();
  private static readonly nexmoProvider = new NexmoProvider();

  static readonly PROVIDER_MAP = new Map<SMSProviderType, BaseSMSProvider>([
    ['twilio', NotificationSmsProviderService.twilioProvider],
    ['netgsm', NotificationSmsProviderService.netgsmProvider],
    ['clickatell', NotificationSmsProviderService.clickatellProvider],
    ['nexmo', NotificationSmsProviderService.nexmoProvider],
  ]);

  static readonly DEFAULT_PROVIDER_NAME: SMSProviderType =
    (env.SMS_DEFAULT_PROVIDER as SMSProviderType) || 'twilio';

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
    // Per-tenant provider selection: honour the `smsProvider` setting unless the
    // caller pinned a provider explicitly.
    let name = providerName;
    if (!name) {
      const configured = await SettingService.getValue(tenantId, 'smsProvider').catch(() => null);
      name = (configured && NotificationSmsProviderService.isValidProviderName(configured) ? configured as SMSProviderType : null)
        || NotificationSmsProviderService.DEFAULT_PROVIDER_NAME;
    }
    const provider = NotificationSmsProviderService.PROVIDER_MAP.get(name);
    if (!provider) {
      Logger.warn(`NotificationSmsProviderService: Unknown provider "${name}", falling back to default`);
      return NotificationSmsProviderService.PROVIDER_MAP.get(NotificationSmsProviderService.DEFAULT_PROVIDER_NAME)!;
    }
    if (!(await provider.isConfigured(tenantId))) {
      Logger.warn(`NotificationSmsProviderService: Provider "${name}" not configured for tenant ${tenantId}, trying fallback`);
      for (const [, p] of NotificationSmsProviderService.PROVIDER_MAP) {
        if (await p.isConfigured(tenantId)) {
          Logger.info(`NotificationSmsProviderService: Using fallback provider "${p.name}"`);
          return p;
        }
      }
    }
    return provider;
  }

  static async listProviders(tenantId: string): Promise<{ name: SMSProviderType; configured: boolean }[]> {
    const result: { name: SMSProviderType; configured: boolean }[] = [];
    for (const [name, provider] of NotificationSmsProviderService.PROVIDER_MAP) {
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
