# Auth Sso Module

OAuth2 / OIDC social login and account-linking for 11 providers. Handles auth-URL generation, callback token exchange, user-info mapping, automatic user creation/linking, signed link-intent state for the Connected Accounts flow, and placeholder-email synthesis for providers that withhold an email. Entirely platform-global — provider gating and OAuth client credentials come from process-level env vars.

---

## Files

| File | Purpose |
|---|---|
| `auth_sso.service.ts` | `SSOService` — auth URL generation, callback handling, authenticate-or-register, account link/unlink, signed link-state |
| `auth_sso.config.ts` | `SSO_CONFIGS` per-provider OAuth config (from env), `getCallbackUrl`, `isProviderConfigured`, `getAllowedProviders` |
| `auth_sso.types.ts` | `SSOProfile`, `SSOTokens`, `SSOCallbackResult`, `SSOProviderConfig`, `SSOProviderService` (Zod schemas + interfaces) |
| `auth_sso.dto.ts` | Request DTOs: `GenerateAuthUrlDTO`, `HandleCallbackDTO`, `AuthenticateOrRegisterDTO`, `LinkAccountDTO`, `UnlinkAccountDTO`, `GetLinkedAccountsDTO` |
| `auth_sso.enums.ts` | `SSOProviderEnum` / `SSOProvider` (Zod enum of the 11 providers) |
| `auth_sso.messages.ts` | `SSOMessages` error/success strings |
| `providers/base.provider.ts` | `BaseSSOProvider` abstract class — generic OAuth2 flow, PKCE + Basic-auth helpers, token normalisation |
| `providers/index.ts` | `getProvider(provider)` — lazy, cached provider instance factory |
| `providers/google.provider.ts` | Google OAuth2 |
| `providers/github.provider.ts` | GitHub OAuth2 |
| `providers/microsoft.provider.ts` | Microsoft OAuth2 |
| `providers/apple.provider.ts` | Sign in with Apple (dynamic ES256-signed client secret) |
| `providers/facebook.provider.ts` | Facebook Login |
| `providers/linkedin.provider.ts` | LinkedIn OAuth2 |
| `providers/slack.provider.ts` | Slack OpenID Connect |
| `providers/tiktok.provider.ts` | TikTok Login |
| `providers/twitter.provider.ts` | Twitter/X OAuth2 (PKCE + Basic auth) |
| `providers/wechat.provider.ts` | WeChat OAuth (`openid` round-tripped to userinfo) |
| `providers/autodesk.provider.ts` | Autodesk OAuth2 (Basic auth) |
| `dictionaries/` | Localization (EN, ES, TR) |

---

## Supported Providers

`google` · `apple` · `facebook` · `github` · `linkedin` · `microsoft` · `twitter` · `slack` · `tiktok` · `wechat` · `autodesk`

Each provider is gated two ways: it must be **configured** (`isProviderConfigured` — a non-empty `clientId` derived from env) and **allowed** (`getAllowedProviders` — present in `env.SSO_ALLOWED_PROVIDERS` AND configured).

---

## Service responsibilities (`SSOService`)

| Method | Responsibility |
|---|---|
| `getAllowedProviders()` | Configured providers that are also in `env.SSO_ALLOWED_PROVIDERS`. |
| `isProviderEnabled(provider)` | Whether the provider is in the allowed list. |
| `generateAuthUrl(provider, state?)` | Build the provider redirect URL; throws `PROVIDER_NOT_CONFIGURED` if unconfigured. |
| `handleCallback(provider, code, state?)` | Exchange `code` for tokens and fetch the mapped `{ profile, tokens }`. |
| `authenticateOrRegister(provider, code, state?)` | Sign-in flow: find existing social account → else link to a user matched by **real** email → else create a new user. Returns `{ user, isNewUser }`. |
| `linkAccount(userId, provider, code)` | Link a provider to a known user (no email check). |
| `signLinkState(userId, email, returnPath?)` | JWT (`CSRF_SECRET`, 600s TTL) encoding a `link` intent: initiating user + expected email + optional return path. |
| `parseLinkState(state)` | Decode/verify a link-state token; returns `null` if it isn't a valid link token. |
| `safeReturnPath(input)` | Open-redirect guard: app-relative paths only (`/`, not `//`); falls back to the root-tenant profile (see Tenant Variability). |
| `linkToUser(userId, expectedEmail, provider, code, state?)` | Complete a Connected-Accounts link; **rejects** missing/synthetic emails and any email mismatch (`EMAIL_NOT_FOUND` / `EMAIL_MISMATCH`). |
| `unlinkAccount(userId, provider)` | Remove a linked social account. |
| `getLinkedAccounts(userId)` | List a user's linked social accounts. |
| `synthesizeSSOEmail(provider, sub)` | Build a stable `${provider}-${sub}@noreply.invalid` placeholder for providers that withhold an email. |
| `isPlaceholderEmail(email)` | Detect a synthesized placeholder so login flows can prompt for a real address. |

Linked-account persistence is delegated to `UserSocialAccountService`; user lookup/creation to `UserService`.

---

## Entities

This module owns **no entity / DB table**. Linked social accounts are persisted by the `user_social_account` module; users by the `user` module.

---

## API Routes

All routes are tenant-scoped under `/tenant/[tenantId]/api/...`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenant/[tenantId]/api/auth/sso` | public | List allowed providers (`{ providers }`). |
| GET | `/tenant/[tenantId]/api/auth/sso/[provider]` | public, rate-limited | Generate the OAuth redirect URL. `state = "<tenantId>.<uuid>"`. Returns `{ url, state }`; 400 if the provider isn't enabled. |
| GET | `/tenant/[tenantId]/api/auth/me/social-accounts/connect/[provider]` | authenticated, rate-limited | Start a **link** flow from the me page. Rejects placeholder-email accounts, mints a signed link-state via `signLinkState`, returns `{ url, state }`. |

Each provider's OAuth callback returns to the per-provider `callbackPath` (`/api/auth/callback/<provider>`, see `SSO_CONFIGS`); the handler calls `authenticateOrRegister` (sign-in) or `linkToUser` (link, when `parseLinkState` matches).

---

## Settings

This module reads **no setting keys**. Provider gating and OAuth client config come exclusively from process-level env vars:

| Env var | Purpose |
|---|---|
| `SSO_ALLOWED_PROVIDERS` | Comma-separated allow-list of provider ids. |
| `APPLICATION_HOST` | Base host used to build callback URLs (defaults to `http://localhost:3000`). |
| `CSRF_SECRET` | Signs link-state JWTs and derives deterministic PKCE verifiers. |
| `<PROVIDER>_CLIENT_ID` / `<PROVIDER>_CLIENT_SECRET` | Per-provider OAuth credentials (e.g. `GOOGLE_CLIENT_ID`, `META_CLIENT_*`, `TIKTOK_CLIENT_KEY`, `WECHAT_APP_*`). See `SSO_CONFIGS`. |

Per-tenant SSO setting keys exist elsewhere (`ssoAllowedProviders` in `auth`; `ssoEnabled` / `ssoProvider` / `ssoConfig` in `tenant_session`; `disableSocialLogin` in `auth`) but are **not** consulted by this module — see *Tenant Variability*.

---

## Security

- **State / CSRF.** `generateAuthUrl` is called with a high-entropy `state` (`<tenantId>.<uuid>`) that providers round-trip on the callback. Twitter/X derives a PKCE verifier deterministically from `state` via `HMAC(CSRF_SECRET, state)` — 256-bit, base64url, unrecoverable without the secret.
- **Link-intent integrity.** `signLinkState` / `parseLinkState` use a `CSRF_SECRET`-signed JWT (600s TTL) so the callback can prove the link is applied to the same user that initiated it. `linkToUser` additionally enforces an exact (case-insensitive) email match and rejects missing/synthetic emails (the "ancak aynı mail adresi ise" requirement).
- **Open-redirect guard.** `safeReturnPath` accepts app-relative paths only (must start with `/`, not `//`) and falls back to a safe profile path.
- **Placeholder emails.** Providers that never return an email (Apple in some flows, Twitter/X, TikTok, WeChat) get a synthesized `…@noreply.invalid` address (RFC 6761 reserved TLD — cannot collide with real addresses). `authenticateOrRegister` never matches an existing user by a synthetic email.
- **Confidential clients.** Providers requiring HTTP Basic auth (X, Autodesk) use `basicAuthHeader()` instead of posting the client secret in the body; Apple's client secret is a dynamically generated ES256 JWT.

---

## Flow

```typescript
import SSOService from '@/modules/auth_sso/auth_sso.service';

// 1. Generate the redirect URL (state binds the flow to the tenant + a nonce)
const state = `${tenantId}.${crypto.randomUUID()}`;
const url = SSOService.generateAuthUrl('google', state);
// Redirect the user to `url`

// 2. In the OAuth callback route, sign in or register:
const { user, isNewUser } = await SSOService.authenticateOrRegister('google', code, state);
// user is created, linked, or returned — depending on the social account / email match
```

```typescript
// Connected Accounts: link a provider to the signed-in user
const state = SSOService.signLinkState(user.userId, user.email, `/tenant/${tenantId}/admin/me`);
const url = SSOService.generateAuthUrl('github', state);
// …on callback, after parseLinkState confirms the intent:
await SSOService.linkToUser(user.userId, user.email, 'github', code, state);
```

---

## Adding a New Provider

1. Create `providers/<name>.provider.ts` extending `BaseSSOProvider` (override `mapUserInfo` at minimum; override `generateAuthUrl` / `getTokens` / `getUserInfo` for vendor quirks).
2. Add the provider id to `SSOProviderEnum` in `auth_sso.enums.ts`.
3. Add its config (URLs, scopes, env-backed `clientId`/`clientSecret`) to `SSO_CONFIGS` in `auth_sso.config.ts`.
4. Register the class in the `getProvider` switch in `providers/index.ts`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

auth_sso implements OAuth2 social login/account-linking for 11 providers, but is entirely platform-global: provider gating and OAuth client credentials come from process-level env vars, with no per-tenant setting reads, no tenant-scoped entity, and no tenantId-aware branching.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Allowed/enabled provider list is global, read from process env SSO_ALLOWED_PROVIDERS, so every tenant gets the same SSO buttons; a tenant cannot enable/disable providers for itself | `auth_sso.config.ts:getAllowedProviders / auth_sso.service.ts:getAllowedProviders,isProviderEnabled` | Routes already run under /tenant/[tenantId]/api/auth/sso and the per-tenant keys 'ssoAllowedProviders' (auth.setting.keys.ts) and 'ssoEnabled' (tenant_session.setting.keys.ts) already exist, but the service never consults them — it filters env.SSO_ALLOWED_PROVIDERS instead. A tenant admin should be able to choose which providers appear. | `ssoAllowedProviders` |
| OAuth client credentials (clientId/clientSecret) for every provider are hardcoded to global env vars (GOOGLE_CLIENT_ID, etc.) in SSO_CONFIGS, so all tenants share one OAuth app per provider; a tenant cannot bring its own OAuth client | `auth_sso.config.ts:SSO_CONFIGS / isProviderConfigured` | isProviderConfigured and getProvider read only the env-derived SSO_CONFIGS map with no tenantId, while the sibling auth_saml.service.ts resolves config per tenant via generateAuthUrl(tenantId, ...). The per-tenant 'ssoConfig'/'ssoProvider' keys (tenant_session.setting.keys.ts) exist for exactly this but are unused here. | `ssoConfig` |
| Whether SSO/social login is available at all is global; the per-tenant 'ssoEnabled' (tenant_session) and 'disableSocialLogin' (auth) flags exist but are never checked by SSOService before generating auth URLs or authenticating | `auth_sso.service.ts:generateAuthUrl,authenticateOrRegister,isProviderEnabled` | These methods gate only on env-based provider configuration, ignoring the tenant-scoped enable/disable setting keys, so a tenant cannot turn social login off for its users. | `ssoEnabled` |
| safeReturnPath / signLinkState fallback redirect is hardcoded to the ROOT_TENANT_ID profile path (/tenant/<ROOT>/admin/me) instead of the requesting tenant's profile path | `auth_sso.service.ts:safeReturnPath` | On a tampered/expired link state the user is bounced to the root tenant's /admin/me regardless of which tenant initiated the flow; the fallback should be derived from the request's tenantId so users stay within their own tenant. | — |

---

## Dependencies

Requires: `user`, `user_session`, `user_social_account`, `env`.
