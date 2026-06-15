# Linked Social Accounts

- **id:** `user_social_account`
- **tier:** identity
- **version:** 1.0.0
- **dir:** `modules/user_social_account/`
- **tags:** identity, auth
- **icon:** `fas fa-link`
- **hasNextLayer:** false

Per-user linked OAuth provider accounts (provider id, external user id, tokens).

## Dependencies

- **requires:** `db`, `user`

## Services

- `social_identity_merge.service.ts`
- `user_social_account.link.service.ts`
- `user_social_account.read.service.ts`
- `user_social_account.service.ts`
- `user_social_account.token.service.ts`

## Entities

- `user_social_account.entity.ts`

## Enums

- `user_social_account.enums.ts`

## Message keys

- `user_social_account.messages.ts`

## TypeORM entities

- `UserSocialAccount` (system) — `modules/user_social_account/entities/user_social_account.entity.ts`

## README

# User Social Account Module

External federated identity linking. Stores the OAuth/SAML accounts a user has connected (provider, external id, tokens), links and unlinks them, and prevents the same provider account from being linked to more than one user. Rows live in the **system DB** and have no `tenantId` — a user can belong to many tenants but has one set of linked identities.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `UserSocialAccount` | `user_social_accounts` | A user's link to one external `(provider, providerId)` identity, plus the access/refresh tokens minted at link time. |

Lives in the **system DB** (accessed via `getDataSource()`; no `tenantId` column). A `@Unique(['provider', 'providerId'])` constraint enforces one-user-per-provider-account; `userId` is indexed for per-user lookups.

---

## Files

| File | Purpose |
|---|---|
| `user_social_account.service.ts` | Core: `getByUserId`, `getByProviderAndProviderId`, `link`, `updateTokens`, `unlink`, `findUserIdByProvider` |
| `user_social_account.types.ts` | `UserSocialAccount` / `SafeUserSocialAccount` types + zod schemas |
| `user_social_account.enums.ts` | `SocialAccountProviderEnum`, `SocialAccountProvider`, `isOAuthSSOProvider()` |
| `user_social_account.messages.ts` | Error message strings |
| `entities/user_social_account.entity.ts` | TypeORM entity |
| `user_social_account.seed.ts` | Demo seed (system-scoped, idempotent on the provider/providerId natural key) |

---

## Supported Providers

The provider set is the OAuth SSO enum (`SSOProviderEnum`) **plus** the `saml` pseudo-provider, so a linked SAML identity shows up alongside OAuth logins in one panel:

`google` · `apple` · `facebook` · `github` · `linkedin` · `microsoft` · `twitter` · `slack` · `tiktok` · `wechat` · `autodesk` · `saml`

`isOAuthSSOProvider(p)` narrows a provider to the OAuth-SSO subset (everything except `saml`).

---

## SafeUserSocialAccount vs UserSocialAccount

`UserSocialAccount` includes raw `accessToken` and `refreshToken` — never serialize these in API responses. `SafeUserSocialAccount` omits both (`SafeUserSocialAccountSchema = UserSocialAccountSchema.omit({ accessToken, refreshToken })`). Every public service method returns the `Safe` shape.

---

## Service

| Method | Returns | Responsibility |
|---|---|---|
| `getByUserId(userId)` | `SafeUserSocialAccount[]` | List a user's linked accounts (Redis-cached). |
| `getByProviderAndProviderId(provider, providerId)` | `SafeUserSocialAccount \| null` | Look up the account for an external identity (Redis-cached) — OAuth callback hot path. |
| `link(userId, provider, providerId, accessToken?, refreshToken?, profilePicture?)` | `SafeUserSocialAccount` | Create or update the link; refreshes tokens/avatar if it already exists for this user. |
| `updateTokens(userSocialAccountId, accessToken, refreshToken?)` | `void` | Replace stored tokens (e.g. after a refresh). |
| `unlink(userId, provider)` | `void` | Remove a user's link to a provider; throws `ACCOUNT_NOT_FOUND` if none. |
| `findUserIdByProvider(provider, providerId)` | `string \| null` | Resolve which user owns an external identity (thin wrapper over `getByProviderAndProviderId`). |

---

## Duplicate Prevention

`link()` first looks up the existing row by `(provider, providerId)`. If one exists and belongs to a **different** user, it throws `ACCOUNT_ALREADY_LINKED` — a provider account can only be linked to one user at a time. If it belongs to the same user, the call updates the tokens/avatar instead of inserting. The DB-level `@Unique(['provider', 'providerId'])` constraint backstops this.

---

## Usage

```typescript
import UserSocialAccountService from '@/modules/user_social_account/user_social_account.service';

// Link after a successful OAuth callback (positional args, not an options object):
await UserSocialAccountService.link(
  userId,
  'github',
  '12345',
  'gho_xxx',                                          // accessToken (optional)
  'ghr_xxx',                                          // refreshToken (optional)
  'https://avatars.githubusercontent.com/u/12345',   // profilePicture (optional)
);

// List all linked accounts (returns SafeUserSocialAccount[] — tokens stripped):
const accounts = await UserSocialAccountService.getByUserId(userId);

// Resolve a user from an external identity (OAuth callback):
const ownerUserId = await UserSocialAccountService.findUserIdByProvider('github', '12345');

// Unlink:
await UserSocialAccountService.unlink(userId, 'github');
```

---

## API Routes

User-scoped, authenticated as the current session user. Linking normally happens automatically through the SSO/SAML callback (see `auth_sso` / `auth_saml`); these `me` routes let a logged-in user manage and add links from the account panel.

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/auth/me/social-accounts` | List the current user's linked accounts |
| DELETE | `/tenant/[tenantId]/api/auth/me/social-accounts/[provider]` | Unlink a provider from the current user |
| GET | `/tenant/[tenantId]/api/auth/me/social-accounts/connect/[provider]` | Start an OAuth flow to link a provider to the current user |
| GET | `/tenant/[tenantId]/api/auth/me/social-accounts/connect/saml` | Start the tenant SAML flow to link the IdP identity to the current user |

Although routed under `/tenant/[tenantId]`, the underlying rows are system-scoped — the per-tenant path only keeps the account panel in tenant scope. The `connect/*` routes reject placeholder emails and disabled/unconfigured providers before issuing the auth URL; the actual link is performed by the SSO/SAML callback using a signed link-state JWT.

---

## Caching

Social account lookups are cached in Redis (TTL = `SESSION_CACHE_TTL`, default 5 min / 300s):

| Key | Used by |
|---|---|
| `user_social_account:user:{userId}` | `getByUserId` (lists a user's accounts) |
| `user_social_account:provider:{provider}:{providerId}` | `getByProviderAndProviderId`, `findUserIdByProvider` — OAuth callback hot path |

`link` and `unlink` clear both keys for the affected user+provider. `updateTokens` does **not** invalidate, because tokens are stripped from `SafeUserSocialAccount` (and thus are not part of the cached value).

TTL is jittered (`jitter(...)`) and reads are wrapped in in-process single-flight (`singleFlight`) — important on the OAuth callback path, where many concurrent provider lookups for popular providers can collide. The `provider` lookup caches `null` misses too, so unknown identities don't repeatedly hit the DB.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

No per-tenant variability — Stores users' federated OAuth/SAML identity links (provider, providerId, tokens) in the system database via getDataSource(), with no tenantId column or per-tenant settings — it is entirely system/global-scoped and has no tenant-variability surface.

---

## Dependencies

`module.json` declares: requires `db`, `user`. Also collaborates with `auth_sso` and `auth_saml` (callbacks that drive linking) and `redis`/`env` (caching).
