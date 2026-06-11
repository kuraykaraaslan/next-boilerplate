# Good to Have — Auth SSO

> Features not yet implemented that would make this module production-ready for a multi-tenant, multi-purpose, multi-country SaaS platform.

---

## Multi-tenancy

### Enforce `ssoAllowedProviders` and `disableSocialLogin` per tenant at the service layer
**Why:** The per-tenant settings `ssoAllowedProviders` (declared in `auth.setting.keys.ts`) and `disableSocialLogin` (enforced in `auth.policy.service.ts`) exist in the system, but `SSOService.generateAuthUrl`, `authenticateOrRegister`, and `isProviderEnabled` read only from the global `env.SSO_ALLOWED_PROVIDERS` env var — they never consult the request tenant's settings. A tenant that has `disableSocialLogin=true` cannot prevent OAuth logins through this module.
**Complexity:** Medium
**Multi-tenant relevance:** This is the core multi-tenancy gap: every tenant gets the same provider buttons and the same auth path regardless of its configured policy. B2B tenants that want SAML-only login cannot enforce it while this module ignores the per-tenant disable flag.
**Multi-country relevance:** Certain country deployments (e.g. a China-region tenant) may need to restrict to WeChat only, while an EU tenant bans WeChat entirely for GDPR data-flow reasons. Without per-tenant gating, this is impossible.

### Per-tenant OAuth client credentials (Bring Your Own OAuth App)
**Why:** All tenants share one OAuth app per provider (a single `GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc. from env). Enterprise tenants often require their own registered OAuth application for branding, rate-limit isolation, and to satisfy their IdP's own security policy. The sibling `auth_saml` module already resolves config per tenant; SSO should follow the same pattern.
**Complexity:** High
**Multi-tenant relevance:** Enterprise OAuth integrations that need their own verified `redirect_uri` domain, their own consent screen branding, or their own rate limits cannot share a platform-wide OAuth app. White-label SaaS products in particular cannot show the platform's OAuth consent screen to their users.
**Multi-country relevance:** China (WeChat), Russia, and some Middle Eastern markets have national OAuth providers and regulatory requirements that the platform app must be registered under a local legal entity. Per-tenant credentials are the only way to route around this.

### Tenant-scoped `safeReturnPath` fallback
**Why:** When the link-state JWT is invalid or expired, `safeReturnPath` falls back to `ROOT_TENANT_ID` (`/tenant/<root>/admin/me`) regardless of which tenant initiated the flow. A user completing a Connected-Account link for tenant `A` who gets a redirect on state expiry lands in the root-tenant UI — often a blank or broken page.
**Complexity:** Low
**Multi-tenant relevance:** Every tenant should have its own fallback return URL (e.g. its own `/admin/me`). Sending users to the root tenant on error is a user-experience failure and a minor tenant-isolation leak (reveals the existence of the root tenant to end users).
**Multi-country relevance:** No direct compliance impact, but a user in a country-specific tenant (e.g. a Turkish-language deployment) should not be redirected to a platform-root page in English.

---

## Security

### Random password generation for SSO-created users uses `Math.random()`
**Why:** `authenticateOrRegister` generates the initial password for new SSO-registered users with `Math.random().toString(36)` — a non-cryptographic RNG. Although the password is never shown to the user and is typically unusable without credential flow, it is a stored bcrypt hash derived from a predictable seed, which is a security posture inconsistency.
**Complexity:** Low
**Multi-tenant relevance:** No per-tenant impact, but the inconsistency — where TOTP backup codes correctly use `crypto.randomInt` while this path does not — creates a confusing dual standard in the codebase.
**Multi-country relevance:** PCI-DSS 6.2.4 requires use of approved cryptographic random number generators; `Math.random()` fails this criterion.

### Refresh token storage and rotation for linked social accounts
**Why:** Provider refresh tokens are stored via `UserSocialAccountService.updateTokens` but are never rotated or revalidated. If a provider revokes the access token (user revokes app permission), the stored social account remains linked with a stale/invalid token and no mechanism exists to detect this and prompt re-linkage.
**Complexity:** High
**Multi-tenant relevance:** Per-tenant SSO postures differ; a tenant may want immediate revocation detection (e.g. a financial tenant), while a consumer tenant tolerates stale tokens.
**Multi-country relevance:** GDPR Art. 7(3) requires that users can withdraw consent at any time and that this withdrawal is effective immediately; a user revoking the OAuth grant at the provider should propagate to the platform.

### PKCE support for all providers (not just Twitter/X)
**Why:** PKCE (`code_challenge` / `code_verifier`) is supported only for Twitter/X via `pkceVerifier` and `pkceChallenge` in `BaseSSOProvider`. OAuth 2.1 (the successor to RFC 6749) makes PKCE mandatory for all public clients. Google, GitHub, Microsoft, and LinkedIn all support PKCE; using it with them would harden against authorization-code interception.
**Complexity:** Medium
**Multi-tenant relevance:** No per-tenant variation needed, but enabling PKCE universally raises the platform's security baseline for all tenants.
**Multi-country relevance:** German BSI, UK NCSC, and US CISA OAuth security guidance all recommend or require PKCE for authorization-code flows; platform adoption ensures country-specific hardening requirements are met.

### Access token storage scope minimisation
**Why:** Full OAuth `accessToken` and `refreshToken` values are stored in `user_social_account` rows. These tokens grant real upstream API access (e.g. read GitHub repos, post to Twitter). If the database is exfiltrated, all stored social tokens are compromised. Tokens should be encrypted at rest, or the platform should store only the minimum needed (e.g. just the provider `sub`/UID for identity, dropping the access token after account linking is complete).
**Complexity:** High
**Multi-tenant relevance:** Tenants with higher data-classification requirements (healthcare, legal) should be able to opt out of token persistence entirely.
**Multi-country relevance:** GDPR Art. 25 (data protection by design) and Art. 32 (security of processing) require encryption of authentication credentials at rest. Storing raw OAuth access tokens without encryption violates both.

---

## Compliance

### Consent recording for social login account creation
**Why:** When `authenticateOrRegister` creates a new user via a social provider, no consent record (Terms of Service / Privacy Policy version) is captured. The same gap exists in `auth.register`, but it is compounded here because the user never fills in a form where consent could be presented.
**Complexity:** Medium
**Multi-tenant relevance:** Each tenant may have its own ToS version; JIT-created SSO users must be shown and must accept the tenant's ToS before being onboarded.
**Multi-country relevance:** GDPR Art. 7, LGPD Art. 8, and KVKK require that consent be freely given, specific, informed, and unambiguous — a user who goes through a social OAuth flow and is silently registered has not given GDPR-compliant consent.

### Provider-side token revocation on account unlink
**Why:** `unlinkAccount` calls `UserSocialAccountService.unlink` (which removes the local record) but does not call the provider's token-revocation endpoint. The user's OAuth grant at the provider side remains active — the platform no longer holds the token, but the grant can be re-exercised via provider account settings.
**Complexity:** Medium
**Multi-tenant relevance:** No per-tenant variation needed, but the risk applies equally to all tenants whose users unlink social accounts.
**Multi-country relevance:** GDPR Art. 7(3) requires that withdrawal of consent (unlinking the account) is as easy as giving it and immediately effective — the upstream grant must be revoked, not just the local record deleted.

---

## Localization / i18n

### Locale-aware OAuth consent screen `login_hint` and `ui_locales`
**Why:** `BaseSSOProvider.generateAuthUrl` builds the redirect URL with `client_id`, `redirect_uri`, `response_type`, and `scope` only. Google, Microsoft, and LinkedIn all support `ui_locales` and `login_hint` query parameters that pre-select the user's language on the OAuth consent screen. Without these, a Turkish-language user sees an English consent screen on Google OAuth.
**Complexity:** Low
**Multi-tenant relevance:** Tenants serving non-English markets need OAuth consent screens in the user's language; passing `ui_locales` from the user's browser `Accept-Language` is the standard mechanism.
**Multi-country relevance:** French (LOI Toubon), Turkish (KVKK guidance), and EU consumer-rights regulations all have implications for user-facing language; a consent screen in the wrong language is a UX compliance issue.

### Localised placeholder-email handling error messages
**Why:** `SSOMessages` error strings are English-only keys. When `EMAIL_NOT_FOUND` or `EMAIL_MISMATCH` is thrown during `linkToUser`, the client receives an English error key. The `dictionaries/` directory has EN/ES/TR but is not wired to these error paths.
**Complexity:** Low
**Multi-tenant relevance:** Tenants serving non-English markets need localised error messages for all user-facing flows, including OAuth account linking.
**Multi-country relevance:** Same as above — the dictionaries exist for UI components but are not wired to service-layer errors surfaced via the API.

---

## Developer Experience

### Type-safe provider registry (no raw `switch` in `providers/index.ts`)
**Why:** `getProvider(provider)` uses a `switch` statement with a `default` that throws a runtime error for unknown providers. Adding a new provider requires changes in four places (`auth_sso.enums.ts`, `auth_sso.config.ts`, `providers/index.ts`, and the new class file). A typed provider registry (e.g. a `Record<SSOProvider, () => BaseSSOProvider>`) would enforce completeness at compile time and reduce `switch` sprawl.
**Complexity:** Low
**Multi-tenant relevance:** No per-tenant impact, but the friction of adding a new provider delays market-specific providers (e.g. KakaoTalk for Korea, LINE for Japan, VKontakte for Russia).
**Multi-country relevance:** Market-specific OAuth providers for major non-Western markets require rapid provider onboarding; compile-time completeness checking reduces regression risk.

### E2E test coverage for the OAuth callback flow per provider
**Why:** `tests/auth_sso.service.test.ts` tests service-layer logic, but there are no integration/E2E tests that mock the provider's token endpoint and userinfo endpoint to exercise the full callback → authenticate-or-register → session-creation flow for each of the 11 providers.
**Complexity:** Medium
**Multi-tenant relevance:** Provider-specific quirks (Apple's POST-based callback, WeChat's two-step openid flow, TikTok's separate userinfo request) can silently break for any provider without per-provider test coverage.
**Multi-country relevance:** Providers like WeChat (China), TikTok (global but PRC-origin), and Autodesk (AEC industry) have non-standard OAuth flows that require region-aware testing.

---

## Monitoring

### Structured SSO login metrics per provider and per tenant
**Why:** Successful and failed SSO logins are audit-logged fire-and-forget, but there are no Prometheus/StatsD/OpenTelemetry metrics emitted. Ops teams cannot alert on a sudden drop in Google SSO login success rates (e.g. caused by an expired client secret) without scraping the audit log.
**Complexity:** Medium
**Multi-tenant relevance:** Per-tenant provider success/failure rates would allow identifying whether a specific tenant's SSO configuration is broken without inspecting every audit-log row.
**Multi-country relevance:** Regulatory monitoring requirements (NIS2 Art. 21, SOC 2 CC7.2) require that authentication-system health be continuously monitored; structured metrics are the standard delivery mechanism.

### Detection and alerting for expired or near-expiry OAuth client secrets
**Why:** `isProviderConfigured` checks only whether `clientId` is non-empty. OAuth client secrets have no expiry tracking. When a Google or Microsoft client secret expires, all SSO logins for every tenant using that provider silently fail with `TOKEN_EXCHANGE_FAILED`. There is no proactive alert.
**Complexity:** Medium
**Multi-tenant relevance:** A single expired client secret breaks SSO for all tenants simultaneously, causing a platform-wide incident rather than a tenant-specific one.
**Multi-country relevance:** Platform-wide SSO outages affect all country deployments simultaneously; proactive expiry alerts are an operational baseline for global SaaS.
