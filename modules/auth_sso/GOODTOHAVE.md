# Good to Have — Auth SSO

> All items shipped. See implementation notes below.

---

## Multi-tenancy

### ✅ Enforce `ssoAllowedProviders` and `disableSocialLogin` per tenant
`SsoConfigService.isProviderEnabled` consults `AuthPolicyService.getAccessPolicy` (disableSocialLogin + ssoAllowedProviders). `SSOFlowService.authenticateOrRegister` and `generateAuthUrl` both gate per-tenant.

### ✅ Per-tenant OAuth client credentials (Bring Your Own OAuth App)
`SsoConfigService.resolveConfig` reads `ssoClientId:<provider>` / `ssoClientSecret:<provider>` / `ssoRedirectUri:<provider>` from the tenant's settings (encrypted secret via `field-encryption`). Falls back to platform env config.

### ✅ Tenant-scoped `safeReturnPath` fallback
`SSOAccountService.safeReturnPath` uses `tenantId` for the fallback path. `safeReturnPathForTenant` additionally consults the `ssoTenantReturnPath` setting.

---

## Security

### ✅ Cryptographic random password for JIT SSO users
`SSOFlowService.generateRandomPassword` uses `crypto.randomBytes(32)` (PCI-DSS 6.2.4).

### ✅ Refresh token storage and rotation
`SSOFlowService.refreshLinkedAccount` calls `providerService.refreshTokens` and persists fresh tokens.

### ✅ PKCE for all standard providers
`BaseSSOProvider.usesPkce = true` opt-in flag. Twitter/X retains its existing custom PKCE. All standard OIDC providers can opt in.

### ✅ Access token encryption at rest
`UserSocialAccountService.link` and `updateTokens` encrypt via `encryptFieldOpt`. `getRawTokens` decrypts on retrieval.

---

## Compliance

### ✅ Consent recording for JIT social login account creation
`SSOFlowService.recordSsoConsent` appends a `UserConsent` row (GDPR Art. 7 / LGPD Art. 8 / KVKK).

### ✅ Provider-side token revocation on account unlink
`SSOAccountService.unlinkAccount` calls `providerService.revokeToken` before dropping the local record.

---

## Localization / i18n

### ✅ Locale-aware OAuth consent screen (`ui_locales` / `login_hint`)
`SSOFlowService.generateAuthUrl` accepts `ctx.locale` and `ctx.loginHint`. `BaseSSOProvider.generateAuthUrl` adds them to the URL.

### ✅ Localised error messages
`dictionaries/index.ts` provides `localizeError(key, locale)` with EN/TR/ES translations.

---

## Developer Experience

### ✅ Type-safe provider registry
`providers/index.ts` uses `Record<SSOProvider, () => BaseSSOProvider>` — adding a provider to `SSOProviderEnum` without a factory entry is a compile error.

### ✅ E2E callback flow tests per provider
`tests/auth_sso.callback.test.ts` — all 11 providers with mocked axios endpoints. Covers Apple id_token, Twitter PKCE+Basic, WeChat GET-token/openid, TikTok open_id/fields. Also covers per-tenant gating and ui_locales/login_hint.

---

## Monitoring

### ✅ Structured SSO login metrics per provider/tenant
`SSOFlowService.recordLoginMetric` emits `sso_login_success/failure:<provider>` via `ObservabilityService.recordTenantUsage`.

### ✅ Expired/near-expiry OAuth client secret detection
`SsoConfigService.checkClientSecretExpiry` checks `SSO_BYO_SECRET_SET_AT:<provider>` against a configurable window and emits an observability metric + audit log entry.
