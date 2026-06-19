import { env } from '@kuraykaraaslan/env';
import { listExternalContributions, type ExternalContribution } from '@kuraykaraaslan/common/server/external-extensions';
import { AppError, ErrorCode } from '@kuraykaraaslan/common/server/app-error';
import { E_SIGNATURE_MESSAGES } from './e_signature.messages';
import type BaseESignatureProvider from './providers/base.provider';
import type { CountryCode, CountryHint } from './e_signature.types';
import { IsolatedESignatureProvider } from './providers/isolated.provider';

/**
 * Extension point national e-signature / eID providers contribute into. Providers
 * are now SANDBOXED community plugins (the @esign/* family); resolution is per-tenant
 * via the community bridge — a tenant with the matching plugin installed gets it,
 * with no in-tree fallback (full migration to the marketplace). The descriptive
 * properties (countries, capabilities, LoA, identifier hints) come from the manifest
 * metadata; the runnable ops execute in the isolate via `IsolatedESignatureProvider`.
 *
 * NOTE: the login/sign workflow threads `tenantId` so the right per-tenant plugin +
 * its encrypted config are used. Calls without a tenant resolve nothing.
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

  /** Installed+approved sandboxed esign providers for a tenant (empty without one). */
  private static async contributions(tenantId?: string): Promise<ExternalContribution[]> {
    if (!tenantId) return [];
    return listExternalContributions(tenantId, ESIGN_PROVIDER_POINT);
  }

  private static toProvider(ext: ExternalContribution): IsolatedESignatureProvider {
    return new IsolatedESignatureProvider(ext.key, ext.metadata ?? {}, ext.invoke, ext.configured);
  }

  // ──────────────────────────────────────────────
  // Public Methods
  // ──────────────────────────────────────────────

  static async resolveProvider({
    country,
    providerOverride,
    tenantId,
  }: {
    country?: CountryCode;
    providerOverride?: string;
    tenantId?: string;
  }): Promise<BaseESignatureProvider> {
    const name =
      providerOverride
      ?? (country ? ESignatureProviderService.COUNTRY_MAP.get(country) : undefined)
      ?? ESignatureProviderService.DEFAULT_PROVIDER_NAME;
    const ext = (await ESignatureProviderService.contributions(tenantId)).find((c) => c.key === name);
    if (!ext) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country ?? '-'}`, 422, ErrorCode.VALIDATION_ERROR);
    }
    const provider = ESignatureProviderService.toProvider(ext);
    if (country && provider.supportedCountries.length && !provider.supportedCountries.includes(country)) {
      throw new AppError(`${E_SIGNATURE_MESSAGES.PROVIDER_FOR_COUNTRY_NOT_FOUND}: ${country}`, 422, ErrorCode.VALIDATION_ERROR);
    }
    return provider;
  }

  static async listCountryHints({ includeUnconfigured = false, tenantId }: { includeUnconfigured?: boolean; tenantId?: string } = {}): Promise<CountryHint[]> {
    const grouped = new Map<string, CountryHint['providers']>();
    for (const ext of await ESignatureProviderService.contributions(tenantId)) {
      const provider = ESignatureProviderService.toProvider(ext);
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

  static async listProvidersAdmin(tenantId?: string): Promise<Array<{
    id: string;
    displayName: string;
    countries: readonly CountryCode[];
    capabilities: readonly string[];
    loa: string;
    configured: boolean;
  }>> {
    return (await ESignatureProviderService.contributions(tenantId)).map((ext) => {
      const p = ESignatureProviderService.toProvider(ext);
      return {
        id: p.name,
        displayName: p.displayName,
        countries: p.supportedCountries,
        capabilities: p.capabilities,
        loa: p.defaultLoA,
        configured: p.isConfigured(),
      };
    });
  }

  static async getProviderByName(name: string, tenantId?: string): Promise<BaseESignatureProvider | undefined> {
    const ext = (await ESignatureProviderService.contributions(tenantId)).find((c) => c.key === name);
    return ext ? ESignatureProviderService.toProvider(ext) : undefined;
  }

  static async listProviders(tenantId?: string): Promise<string[]> {
    return (await ESignatureProviderService.contributions(tenantId)).map((c) => c.key);
  }
}
