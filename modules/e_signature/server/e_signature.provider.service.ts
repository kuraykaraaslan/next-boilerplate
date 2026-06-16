import { env } from '@nb/env';
import BaseESignatureProvider from './providers/base.provider';
import MobilImzaAggregatorProvider from './providers/mobil_imza_aggregator.provider';
import SmartIdProvider from './providers/smart_id.provider';
import BankIdSeProvider from './providers/bankid_se.provider';
import LoginGovProvider from './providers/login_gov.provider';
import { AppError, ErrorCode } from '@nb/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type { CountryCode, CountryHint } from './e_signature.types';

export default class ESignatureProviderService {

  // ──────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────

  private static readonly mobilImzaProvider = new MobilImzaAggregatorProvider();
  private static readonly smartIdProvider = new SmartIdProvider();
  private static readonly bankIdSeProvider = new BankIdSeProvider();
  private static readonly loginGovProvider = new LoginGovProvider();

  private static readonly PROVIDERS = new Map<string, BaseESignatureProvider>([
    ['mobil_imza_aggregator', ESignatureProviderService.mobilImzaProvider],
    ['smart_id', ESignatureProviderService.smartIdProvider],
    ['bankid_se', ESignatureProviderService.bankIdSeProvider],
    ['login_gov', ESignatureProviderService.loginGovProvider],
  ]);

  private static readonly DEFAULT_PROVIDER_NAME: string =
    env.EID_DEFAULT_PROVIDER || 'mobil_imza_aggregator';

  private static readonly COUNTRY_MAP: Map<string, string> = ESignatureProviderService.buildCountryMap();

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

  private static buildCountryMap(): Map<string, string> {
    const map = new Map<string, string>();
    const raw = env.EID_PROVIDER_MAP;
    if (raw) {
      for (const pair of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
        const [country, providerName] = pair.split(':').map((s) => s.trim());
        if (country && providerName && ESignatureProviderService.PROVIDERS.has(providerName)) {
          map.set(country.toUpperCase(), providerName);
        }
      }
    } else {
      map.set('TR', 'mobil_imza_aggregator');
      map.set('EE', 'smart_id');
      map.set('LV', 'smart_id');
      map.set('LT', 'smart_id');
      map.set('SE', 'bankid_se');
      map.set('US', 'login_gov');
    }
    return map;
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static resolveProvider({
    country,
    providerOverride,
  }: {
    country?: CountryCode;
    providerOverride?: string;
  }): BaseESignatureProvider {
    const name =
      providerOverride
      ?? (country ? ESignatureProviderService.COUNTRY_MAP.get(country) : undefined)
      ?? ESignatureProviderService.DEFAULT_PROVIDER_NAME;
    const provider = ESignatureProviderService.PROVIDERS.get(name);
    if (!provider) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country ?? '-'}`, 422, ErrorCode.VALIDATION_ERROR);
    }
    if (country && provider.supportedCountries.length && !provider.supportedCountries.includes(country)) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country}`, 422, ErrorCode.VALIDATION_ERROR);
    }
    return provider;
  }

  static listCountryHints({ includeUnconfigured = false }: { includeUnconfigured?: boolean } = {}): CountryHint[] {
    const grouped = new Map<string, CountryHint['providers']>();
    for (const provider of ESignatureProviderService.PROVIDERS.values()) {
      if (!includeUnconfigured && !provider.isConfigured()) continue;
      for (const country of provider.supportedCountries) {
        if (!grouped.has(country)) grouped.set(country, []);
        grouped.get(country)!.push({
          id: provider.name,
          name: provider.displayName,
          identifierLabel: provider.identifierLabel,
          identifierPlaceholder: provider.identifierPlaceholder,
          capabilities: [...provider.capabilities],
          loa: provider.defaultLoA,
        });
      }
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, providers]) => ({ country: country as CountryCode, providers }));
  }

  static listProvidersAdmin(): Array<{
    id: string;
    displayName: string;
    countries: readonly CountryCode[];
    capabilities: readonly string[];
    loa: string;
    configured: boolean;
  }> {
    return Array.from(ESignatureProviderService.PROVIDERS.values()).map((p) => ({
      id: p.name,
      displayName: p.displayName,
      countries: p.supportedCountries,
      capabilities: p.capabilities,
      loa: p.defaultLoA,
      configured: p.isConfigured(),
    }));
  }

  static getProviderByName(name: string): BaseESignatureProvider | undefined {
    return ESignatureProviderService.PROVIDERS.get(name);
  }

  static listProviders(): string[] {
    return Array.from(ESignatureProviderService.PROVIDERS.keys());
  }
}
