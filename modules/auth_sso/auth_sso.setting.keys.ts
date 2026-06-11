import { z } from 'zod';

// Canonical per-tenant setting keys for the auth_sso module. Centralised so the
// service (runtime enforcement) and the settings-fields file (admin UI) never
// drift apart.
//
// `ssoAllowedProviders` / `disableSocialLogin` are NOT declared here — they are
// owned by the `auth` module (auth.policy.loader.service.ts ACCESS_POLICY_KEYS)
// and consumed read-only via AuthPolicyService.getAccessPolicy(tenantId). Adding
// them here would create two competing owners for the same key.
//
// The Bring-Your-Own-OAuth credential keys are namespaced per provider
// (`ssoClientId:<provider>` / `ssoClientSecret:<provider>` / `ssoRedirectUri:<provider>`)
// and are resolved dynamically — they are not part of the enum because the
// provider id is a runtime suffix. See SSO_BYO_KEY helpers below.
export const AuthSsoSettingKeySchema = z.enum([
  'ssoTenantReturnPath',
  'ssoClientSecretExpiryDays',
]);
export type AuthSsoSettingKey = z.infer<typeof AuthSsoSettingKeySchema>;
export const AUTH_SSO_SETTING_KEY_LIST = AuthSsoSettingKeySchema.options;

// Ergonomic named accessors, kept in lockstep with the enum via `satisfies`.
export const AUTH_SSO_SETTING_KEYS = {
  /** Per-tenant fallback return path used by safeReturnPath instead of the root tenant. */
  TENANT_RETURN_PATH: 'ssoTenantReturnPath',
  /**
   * After how many days a BYO OAuth client secret is considered near-expiry and
   * an alert/metric is emitted. 0 = no expiry tracking.
   */
  CLIENT_SECRET_EXPIRY_DAYS: 'ssoClientSecretExpiryDays',
} as const satisfies Record<string, AuthSsoSettingKey>;

// ── Bring-Your-Own OAuth credential keys (dynamic, per-provider) ──────────────
// These are written/read with a `<key>:<provider>` suffix (e.g.
// `ssoClientId:google`). Kept as builder functions so callers never hardcode the
// string shape and the provider suffix stays consistent across read/write paths.
export const SSO_BYO_CLIENT_ID = (provider: string): string => `ssoClientId:${provider}`;
export const SSO_BYO_CLIENT_SECRET = (provider: string): string => `ssoClientSecret:${provider}`;
export const SSO_BYO_REDIRECT_URI = (provider: string): string => `ssoRedirectUri:${provider}`;
/** ISO date string when the BYO secret was last rotated; basis for expiry detection. */
export const SSO_BYO_SECRET_SET_AT = (provider: string): string => `ssoClientSecretSetAt:${provider}`;
