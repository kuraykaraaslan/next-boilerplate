import { env } from '@kuraykaraaslan/env';
import { extensionRegistry, type RuntimeExtension } from '@kuraykaraaslan/common/server/extension-registry';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type BaseESignatureProvider from './providers/base.provider';
import type { CountryCode, CountryHint } from './e_signature.types';

/**
 * Extension point satellite e-signature / eID provider modules contribute into.
 * NOTE: the e-signature provider API is tenant-agnostic (env-keyed config, no
 * tenantId), so discovery here is platform-level — gated by each satellite's
 * manifest `enabled`, not by per-tenant module activation. (The other provider
 * hosts — ai/storage/mail/sms/payment — gate per tenant because their APIs
 * carry a tenantId.)
 */
const ESIGN_PROVIDER_POINT = 'esign:provider';

export default class ESignatureProviderService {

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
        if (country && providerName) map.set(country.toUpperCase(), providerName);
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

  private static keyOf(c: RuntimeExtension): string {
    return c.key ?? (c.metadata?.key as string);
  }

  private static contributions(): RuntimeExtension[] {
    return extensionRegistry.getContributions(ESIGN_PROVIDER_POINT);
  }

  private static async loadByName(name: string): Promise<BaseESignatureProvider | undefined> {
    const c = ESignatureProviderService.contributions().find((x) => ESignatureProviderService.keyOf(x) === name);
    return c ? extensionRegistry.load<BaseESignatureProvider>(c) : undefined;
  }

  private static async loadAll(): Promise<BaseESignatureProvider[]> {
    const out: BaseESignatureProvider[] = [];
    for (const c of ESignatureProviderService.contributions()) {
      out.push(await extensionRegistry.load<BaseESignatureProvider>(c));
    }
    return out;
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static async resolveProvider({
    country,
    providerOverride,
  }: {
    country?: CountryCode;
    providerOverride?: string;
  }): Promise<BaseESignatureProvider> {
    const name =
      providerOverride
      ?? (country ? ESignatureProviderService.COUNTRY_MAP.get(country) : undefined)
      ?? ESignatureProviderService.DEFAULT_PROVIDER_NAME;
    const provider = await ESignatureProviderService.loadByName(name);
    if (!provider) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country ?? '-'}`, 422, ErrorCode.VALIDATION_ERROR);
    }
    if (country && provider.supportedCountries.length && !provider.supportedCountries.includes(country)) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country}`, 422, ErrorCode.VALIDATION_ERROR);
    }
    return provider;
  }

  static async listCountryHints({ includeUnconfigured = false }: { includeUnconfigured?: boolean } = {}): Promise<CountryHint[]> {
    const grouped = new Map<string, CountryHint['providers']>();
    for (const provider of await ESignatureProviderService.loadAll()) {
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

  static async listProvidersAdmin(): Promise<Array<{
    id: string;
    displayName: string;
    countries: readonly CountryCode[];
    capabilities: readonly string[];
    loa: string;
    configured: boolean;
  }>> {
    return (await ESignatureProviderService.loadAll()).map((p) => ({
      id: p.name,
      displayName: p.displayName,
      countries: p.supportedCountries,
      capabilities: p.capabilities,
      loa: p.defaultLoA,
      configured: p.isConfigured(),
    }));
  }

  static async getProviderByName(name: string): Promise<BaseESignatureProvider | undefined> {
    return ESignatureProviderService.loadByName(name);
  }

  static async listProviders(): Promise<string[]> {
    return ESignatureProviderService.contributions().map(ESignatureProviderService.keyOf);
  }
}
