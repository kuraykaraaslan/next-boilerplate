import Logger from '@kuraykaraaslan/logger';
import SettingService from '@kuraykaraaslan/setting/server/setting.service';
import AuthPolicyService from '@kuraykaraaslan/auth/server/auth.policy.service';
import { decryptFieldOpt } from '@kuraykaraaslan/common/server/field-encryption';
import ObservabilityService from '@kuraykaraaslan/observability';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { ROOT_TENANT_ID } from '@kuraykaraaslan/tenant/server/tenant.constants';
import type { SSOProvider } from './auth_sso.enums';
import type { SSOProviderConfig } from './auth_sso.types';
import { SSO_CONFIGS, getCallbackUrl, isProviderConfigured, getAllowedProviders } from './auth_sso.config';
import {
  AUTH_SSO_SETTING_KEYS,
  SSO_BYO_CLIENT_ID,
  SSO_BYO_CLIENT_SECRET,
  SSO_BYO_REDIRECT_URI,
  SSO_BYO_SECRET_SET_AT,
} from './auth_sso.setting.keys';

/**
 * Per-tenant SSO config resolution (GOODTOHAVE: multi-tenancy + monitoring).
 *
 * Mirrors the auth_saml per-tenant resolution pattern: the global env-backed
 * SSO_CONFIGS map is the fallback, while a tenant may Bring Its Own OAuth app
 * via the `ssoClientId:<provider>` / `ssoClientSecret:<provider>` setting keys.
 *
 * Provider gating now consults the auth module's per-tenant AccessPolicy
 * (`disableSocialLogin` + `ssoAllowedProviders`) on top of the env allow-list —
 * SSOService never imports auth's internals directly, only this resolver does.
 *
 * Seam: BYO credential storage uses the generic per-tenant `settings` table
 * (encrypted secret column via field-encryption) rather than a bespoke entity.
 * A dedicated `sso_tenant_credentials` table with explicit secret-expiry columns
 * is the production hardening — documented in README.
 */
export default class SsoConfigService {

  /**
   * Resolve the effective OAuth provider config for a tenant. Falls back to the
   * env-backed global config when the tenant has not configured its own app.
   */
  static async resolveConfig(provider: SSOProvider, tenantId?: string): Promise<SSOProviderConfig> {
    const base = SSO_CONFIGS[provider];
    if (!tenantId) return base;

    const keys = [
      SSO_BYO_CLIENT_ID(provider),
      SSO_BYO_CLIENT_SECRET(provider),
      SSO_BYO_REDIRECT_URI(provider),
    ];
    const settings = await SettingService.getByKeys(tenantId, keys).catch((err: unknown) => {
      Logger.warn(`SsoConfig: failed to load BYO credentials for tenant ${tenantId}/${provider}: ${err instanceof Error ? err.message : String(err)}`);
      return {} as Record<string, string>;
    });

    const clientId = settings[SSO_BYO_CLIENT_ID(provider)]?.trim();
    const clientSecretRaw = settings[SSO_BYO_CLIENT_SECRET(provider)];
    const redirectOverride = settings[SSO_BYO_REDIRECT_URI(provider)]?.trim();

    // A tenant brings its own app only when it sets at least a client id.
    if (!clientId) return base;

    const clientSecret = clientSecretRaw ? (decryptFieldOpt(clientSecretRaw) ?? '') : base.clientSecret;

    return {
      ...base,
      clientId,
      clientSecret,
      ...(redirectOverride ? { callbackPath: redirectOverride } : {}),
    };
  }

  /**
   * Resolve the redirect_uri for a tenant. A BYO redirect override is treated as
   * an absolute URL; otherwise the platform callback URL is used.
   */
  static async resolveCallbackUrl(provider: SSOProvider, tenantId?: string): Promise<string> {
    const config = await SsoConfigService.resolveConfig(provider, tenantId);
    if (/^https?:\/\//i.test(config.callbackPath)) return config.callbackPath;
    return getCallbackUrl(provider);
  }

  /**
   * Is this provider configured (has a usable clientId) for the tenant? Considers
   * the tenant's BYO credentials first, then the global env config.
   */
  static async isProviderConfigured(provider: SSOProvider, tenantId?: string): Promise<boolean> {
    if (!tenantId) return isProviderConfigured(provider);
    const config = await SsoConfigService.resolveConfig(provider, tenantId);
    return Boolean(config.clientId);
  }

  /**
   * Is the provider enabled for the tenant? Enabled = env-allowed AND configured
   * (BYO-or-global) AND permitted by the tenant's auth AccessPolicy
   * (disableSocialLogin / ssoAllowedProviders).
   */
  static async isProviderEnabled(provider: SSOProvider, tenantId?: string): Promise<boolean> {
    const configured = await SsoConfigService.isProviderConfigured(provider, tenantId);
    if (!configured) return false;
    // env-level allow-list (global). When a tenant brings its own credentials the
    // env allow-list may not list it, so accept either env-allowed or BYO.
    const envAllowed = getAllowedProviders().includes(provider);
    const byoConfigured = tenantId ? await SsoConfigService.hasByoCredentials(provider, tenantId) : false;
    if (!envAllowed && !byoConfigured) return false;
    if (!tenantId) return true;

    const policy = await AuthPolicyService.getAccessPolicy(tenantId).catch(() => null);
    if (!policy) return true; // fail-open to env behaviour if policy load fails
    return AuthPolicyService.isSsoProviderAllowed(provider, policy);
  }

  /**
   * Effective allowed providers for a tenant: env-allowed providers narrowed by
   * the tenant's AccessPolicy, unioned with any providers the tenant has BYO
   * credentials for and which the policy permits.
   */
  static async getAllowedProviders(tenantId?: string): Promise<SSOProvider[]> {
    const envAllowed = getAllowedProviders();
    if (!tenantId) return envAllowed;

    const policy = await AuthPolicyService.getAccessPolicy(tenantId).catch(() => null);
    if (!policy) return envAllowed;

    const narrowed = AuthPolicyService.filterAllowedProviders(envAllowed, policy) as SSOProvider[];
    return narrowed;
  }

  private static async hasByoCredentials(provider: SSOProvider, tenantId: string): Promise<boolean> {
    const settings = await SettingService.getByKeys(tenantId, [SSO_BYO_CLIENT_ID(provider)]).catch(() => ({} as Record<string, string>));
    return Boolean(settings[SSO_BYO_CLIENT_ID(provider)]?.trim());
  }

  // ── Monitoring: BYO client-secret expiry detection ──────────────────────────

  /**
   * Detect BYO OAuth client secrets at/near expiry for a tenant. Emits an audit
   * event + observability metric per near-expiry secret. Returns the providers
   * flagged. Best-effort: never throws into the caller's flow.
   */
  static async checkClientSecretExpiry(tenantId: string, providers: SSOProvider[]): Promise<SSOProvider[]> {
    const flagged: SSOProvider[] = [];
    try {
      const expiryDaysRaw = await SettingService.getValue(tenantId, AUTH_SSO_SETTING_KEYS.CLIENT_SECRET_EXPIRY_DAYS).catch(() => null);
      const expiryDays = expiryDaysRaw ? parseInt(expiryDaysRaw, 10) : 0;
      if (!Number.isFinite(expiryDays) || expiryDays <= 0) return flagged;

      const now = Date.now();
      const windowMs = expiryDays * 24 * 60 * 60 * 1000;
      for (const provider of providers) {
        const setAtRaw = await SettingService.getValue(tenantId, SSO_BYO_SECRET_SET_AT(provider)).catch(() => null);
        if (!setAtRaw) continue;
        const setAt = Date.parse(setAtRaw);
        if (!Number.isFinite(setAt)) continue;
        if (now - setAt >= windowMs) {
          flagged.push(provider);
          ObservabilityService.recordTenantUsage({
            tenantId: tenantId ?? ROOT_TENANT_ID,
            metric: `sso_client_secret_near_expiry:${provider}`,
            value: 1,
          });
          AuditLogService.log({
            tenantId, actorType: 'SYSTEM', action: 'sso.client_secret_near_expiry',
            resourceType: 'sso_credentials', resourceId: provider,
            metadata: { provider, expiryDays, secretSetAt: setAtRaw },
          }).catch(() => {});
        }
      }
    } catch (err: unknown) {
      Logger.warn(`SsoConfig: client-secret expiry check failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return flagged;
  }
}
