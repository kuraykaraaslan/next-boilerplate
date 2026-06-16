# API Key

- **id:** `api_key`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/api_key/`
- **tags:** platform, security
- **icon:** `fas fa-key`
- **hasNextLayer:** true

Tenant-scoped API keys for programmatic access (hashed at rest, scope-bound).

## Dependencies

- **requires:** `db`, `env`, `common`, `network`

## Services

- `api_key.crud.service.ts`
- `api_key.rotation.service.ts`
- `api_key.service.ts`
- `api_key.verify.service.ts`

## DTOs

- `api_key.dto.ts`

## Entities

- `api_key.entity.ts`

## Enums

- `api_key.enums.ts`

## Message keys

- `api_key.messages.ts`

## Setting keys

- `api_key.setting.keys.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/api-keys`
- `tenant` PUT/DELETE `/tenant/[tenantId]/api/api-keys/[apiKeyId]`
- `tenant` POST `/tenant/[tenantId]/api/api-keys/[apiKeyId]/rotate`
- `tenant` POST `/tenant/[tenantId]/api/api-keys/revoke-all`
- `tenant` POST `/tenant/[tenantId]/api/api-keys/sweep-expired`
- `tenant` POST `/tenant/[tenantId]/api/api-keys/verify`

## TypeORM entities

- `ApiKey` (tenant) — `modules/api_key/server/entities/api_key.entity.ts`

## Next layer (modules_next/) surface

- `api_key/ui/api-key-columns.component` _(ui, client)_
- `api_key/ui/api-key-create-modal.component` _(ui, client)_

## README

# Api Key Module

Manages tenant-scoped API keys for programmatic authentication. Generates, hashes, and verifies keys with scopes and expiration tracking; creation is gated behind the `feature_api_keys` plan feature and isolated per tenant.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `ApiKey` | `api_keys` | One API key per row: `name`, `description`, SHA-256 `keyHash` (unique index), `scopes`, `keyEnv` (`live`/`test`), `ipAllowlist` (subnets), `isActive`, `lastUsedAt`, `lastUsedIp`, `usageCount`, `successorKeyId` (rotation), `expiresAt`, `createdByUserId`. Indexed by `tenantId`. |

Lives in the **tenant DB**. All rows are isolated by `tenantId` via the per-tenant DataSource.

---

## Files

| File | Purpose |
|---|---|
| `api_key.service.ts` | Core logic: create, getById, list, update, delete, verify, key generation/hashing |
| `api_key.types.ts` | `ApiKey` / `SafeApiKey` zod schemas + types (`SafeApiKey` omits `keyHash`) |
| `api_key.dto.ts` | `CreateApiKeyDTO`, `UpdateApiKeyDTO`, `ListApiKeysDTO` |
| `api_key.enums.ts` | `ApiKeyScopeEnum` / `API_KEY_SCOPES` |
| `api_key.messages.ts` | Error/success message strings |
| `api_key.settings.fields.ts` | UI metadata for the settings page |
| `api_key.setting.keys.ts` | Setting-key Zod enum + named accessors |
| `api_key.seed.ts` | Demo-data seed (read/write, admin, SCIM, revoked keys) |
| `entities/api_key.entity.ts` | TypeORM entity |

---

## Key Concepts

- The raw key is shown **once** at creation — only its SHA-256 hash is stored (`keyHash`).
- Raw key format: `sk_{env}_{first 8 chars of tenantId}_{24 random bytes hex}` where `{env}` is `live` or `test`, derived from `NODE_ENV` (production/vercel → `live`, else `test`) or an explicit `environment` on create. Prevents test keys being mistaken for production ones.
- `SafeApiKey` omits `keyHash` and is the only shape returned to clients.
- Scopes control what the key can access; `verify` can optionally enforce a `requiredScope`.
- **Network pinning:** a key may declare an `ipAllowlist` of subnets (CIDR; a single host is a `/32`). Validation + matching is owned by [`@/modules/network`](../network/README.md) (`SubnetListSchema`, `ipMatchesAllowlist`). A tenant-wide default allowlist applies to keys that declare none.
- **Lifecycle:** keys can be rotated (successor key + grace window), bulk-revoked for incident response, and swept on expiry. Per-tenant policy caps active-key count and max TTL, and can require an expiry.
- **Observability:** every successful verify bumps `usageCount` and records `lastUsedIp`; a dormant key used from a new IP raises an anomaly audit event; failed verifications are audit-logged; per-key rate limiting is enforced from the tenant default.

## Scopes

`ApiKeyScopeEnum` / `API_KEY_SCOPES` (lowercase values):

| Scope | Access |
|---|---|
| `read` | Read-only operations |
| `write` | Create/update operations |
| `admin` | Full tenant admin access |
| `scim:read` | SCIM 2.0 (RFC 7644) read — IdP provisioning bearer tokens |
| `scim:write` | SCIM 2.0 (RFC 7644) write — IdP provisioning bearer tokens |

---

## Services / Responsibilities

`ApiKeyService` (default export, all static):

| Method | Responsibility |
|---|---|
| `create(tenantId, createdByUserId, input)` | Mints a key. Non-root tenants must have `feature_api_keys` in their plan (`TenantSubscriptionService.assertFeatureAccess`); root tenant bypasses. Returns `{ key: SafeApiKey, rawKey }`, clears the negative cache for the new hash, and dispatches the `api_key.created` webhook. |
| `list({ tenantId, page, pageSize })` | Paginated list of the tenant's keys (`SafeApiKey[]` + total), newest first. |
| `getById(tenantId, apiKeyId)` | Single key scoped to the tenant; Redis-cached under a tenant-scoped key. |
| `update(tenantId, apiKeyId, input)` | Updates `name`/`description`/`isActive` on a tenant-owned key; clears cache. |
| `delete(tenantId, apiKeyId)` | Removes a tenant-owned key, clears cache, dispatches the `api_key.deleted` webhook. |
| `update(...)` also dispatches `api_key.updated` and supports `ipAllowlist`. | |
| `rotate(tenantId, apiKeyId, createdByUserId, { graceSeconds })` | Mints a successor key (inherits scopes/allowlist/env), grace-expires (or immediately deactivates) the old key, dispatches `api_key.rotated`. Returns the new `{ key, rawKey }`. |
| `revokeAll(tenantId, actorUserId?)` | Emergency incident-response: deactivates every active key, flushes caches, audit-logs, dispatches `api_key.updated`. Returns the revoked count. |
| `sweepExpired(tenantId)` | Deactivates expired-but-active keys and dispatches `api_key.expired` per key (state hygiene; verify already rejects expired keys at request time). |
| `verify(rawKey, requiredScope?, { ip? })` | Hot-path validation across all tenants by `keyHash`: rejects unknown/inactive/expired keys, insufficient scope, IP outside the (per-key or tenant-default) subnet allowlist, and over-rate-limit calls. Audit-logs failures, raises a dormant-new-IP anomaly, bumps `usageCount`/`lastUsedIp`. Negative-cache TTL is wired from the root setting `apiKeyNegativeCacheTtlSeconds`. |
| `verifyFromAuthHeader(request, tenantId?, requiredScope?, { ip? })` | Parses `Authorization: Bearer <key>`, derives the client IP from proxy headers when not supplied, calls `verify`, optionally pins to a tenant. Used by SCIM 2.0 and other machine-to-machine integrations. |
| `generateRawKey` / `hashKey` | Raw-key generation (env-prefixed) and SHA-256 hashing helpers. |

---

## Usage

```typescript
import ApiKeyService from '@/modules/api_key/api_key.service';

// Create a key (raw secret is returned once — show it, never store it)
const { key, rawKey } = await ApiKeyService.create(tenantId, createdByUserId, {
  name: 'CI Bot',
  scopes: ['read', 'write'],
  expiresAt: '2027-01-01T00:00:00.000Z',
});
// `rawKey` is the secret; `key` is the SafeApiKey (no hash)

// Verify an incoming raw key (optionally enforce a scope)
const verified = await ApiKeyService.verify(rawKey, 'write');
// throws if invalid, inactive, expired, or missing the scope

// Verify from an Authorization: Bearer header (SCIM / M2M)
const fromHeader = await ApiKeyService.verifyFromAuthHeader(request, tenantId, 'scim:read');

// Revoke (delete) a key
await ApiKeyService.delete(tenantId, apiKeyId);
```

---

## API Routes

Management routes are tenant-scoped and require **ADMIN+** tenant role:

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/api-keys` | List keys (paginated) |
| POST | `/tenant/[tenantId]/api/api-keys` | Create a key (returns raw secret once) |
| PUT | `/tenant/[tenantId]/api/api-keys/[apiKeyId]` | Update name/description/active status/IP allowlist |
| DELETE | `/tenant/[tenantId]/api/api-keys/[apiKeyId]` | Permanently revoke a key |
| POST | `/tenant/[tenantId]/api/api-keys/[apiKeyId]/rotate` | Rotate a key (successor + grace window) |
| POST | `/tenant/[tenantId]/api/api-keys/revoke-all` | Emergency: revoke all active keys |
| POST | `/tenant/[tenantId]/api/api-keys/sweep-expired` | Deactivate expired keys + emit `api_key.expired` |

Plus a public verification endpoint (the key itself is the auth — no session):

| Method | Path | Description |
|---|---|---|
| POST | `/tenant/[tenantId]/api/api-keys/verify` | Validate a key from the `x-api-key` header (optional `scope` in body); 401 if the key's `tenantId` does not match the path |

Admin UI: `/tenant/[tenantId]/admin/api-keys` (+ `.../api-keys/settings`).

---

## Caching

API key lookups are cached in Redis (TTL = `API_KEY_CACHE_TTL`, sourced from `env.TENANT_CACHE_TTL`, default 5 min):

| Key | Used by |
|---|---|
| `api_key:hash:{sha256(rawKey)}` | `verify(rawKey)` — hot path on every authenticated API request |
| `api_key:tenant:{tenantId}:{apiKeyId}` | `getById(tenantId, apiKeyId)` |
| `api_key:id:{apiKeyId}` | invalidation key cleared on `update` / `delete` |

`update` and `delete` invalidate by `apiKeyId`, `keyHash`, and `tenantId+apiKeyId`. `create` clears the negative cache for the freshly-minted hash. `lastUsedAt` writes are intentionally fire-and-forget and do **not** invalidate — the value isn't security-critical and refreshing it would defeat the cache.

### Stampede + negative cache

- **TTL jitter (±10%)** spreads expirations so a burst of keys minted in the same second don't refill simultaneously.
- **In-process single-flight** (`modules/redis/redis.cache.ts`) dedupes concurrent loaders for the same key — if 100 requests miss on the same hash at the same time, only one DB query runs.
- **Negative cache** on `verify`: an unknown hash is cached as `__not_found__` for the TTL returned by `getNegativeCacheTtl()` — the root-tenant setting `apiKeyNegativeCacheTtlSeconds` (floored at 60s, capped at the positive TTL, memoised ~60s in-process), falling back to `Math.min(60, API_KEY_CACHE_TTL)`. Credential-stuffing attempts against random hashes hit Redis, not the DB. `create` clears the negative key for the new hash, so freshly-minted keys are immediately usable.

---

## Security

- Raw keys are never stored — only their SHA-256 hash (`keyHash`, unique index) is persisted.
- `SafeApiKey` (the only client-facing shape) omits `keyHash`; the raw key is returned exactly once, from `create`.
- Creation is billing-gated for non-root tenants via `assertFeatureAccess(tenantId, FEATURE_API_KEYS)` (defense-in-depth on top of UI gating).
- `verify` rejects inactive (`KEY_INACTIVE`), expired (`KEY_EXPIRED`), unknown (`INVALID_KEY`), under-scoped (`INSUFFICIENT_SCOPE`), IP-blocked (`IP_NOT_ALLOWED`), and over-rate-limit (`RATE_LIMITED`) keys.
- Every failed verification is audit-logged (`api_key.verify.failed`, actor type `API_KEY`); a dormant key first used from a new IP raises `api_key.anomaly.detected`.
- Per-key subnet allowlists (and a tenant-wide default) restrict where a key may be used; per-key rate limiting caps verify throughput.
- The negative cache blunts credential-stuffing by serving repeated unknown-hash guesses from Redis instead of the DB.

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/api-keys/settings` (gear button in the API Keys page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `api_key.settings.fields.ts`. The `env:TENANT_CACHE_TTL` deployment var is **not** exposed here.

Setting keys are declared in `api_key.setting.keys.ts` (Zod enum + named accessors). UI field metadata: `api_key.settings.fields.ts`.

| Key | Type | Group | Notes |
|---|---|---|---|
| `apiKeyNegativeCacheTtlSeconds` | number | Caching | Negative-cache TTL for missing keys (min 60s). **Wired** — read from the **root tenant** (the negative cache keys on a hash before the owning tenant is known) and applied in `verify`. |
| `apiKeyMaxActiveKeys` | number | Lifecycle | Max active keys per tenant (0 = unlimited), enforced on `create`. |
| `apiKeyMaxTtlDays` | number | Lifecycle | Cap on how far out a key may expire (0 = no cap). |
| `apiKeyRequireExpiry` | boolean | Lifecycle | Require every new key to declare an expiry. |
| `apiKeyTenantIpAllowlist` | textarea | Network | Default subnets (CIDR) applied to keys without their own allowlist. |
| `apiKeyDefaultRateLimitPerMinute` | number | Network | Per-key verify rate limit (0 = unlimited). |

Read/written via the shared settings path. `env:TENANT_CACHE_TTL` (deployment var) is **not** exposed here.

---

## Webhook events

`api_key.created`, `api_key.updated`, `api_key.deleted`, `api_key.expired`, `api_key.rotated` (see `modules/webhook`).

## Dependencies

Adds **[`network`](../network/README.md)** for subnet (CIDR) validation + matching (`SubnetListSchema`, `ipMatchesAllowlist`), on top of `db`, `env`, `common`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The api_key module issues, stores, and verifies per-tenant API keys (hashed, scoped, expirable) in each tenant's own database, gating creation on a per-tenant subscription feature, but exposes no working per-tenant settings (its one declared setting field is never read).

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `ApiKey` | `api_keys` | name, description, keyHash, scopes, isActive, expiresAt, createdByUserId, lastUsedAt |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `api_key.service.ts:create` — API key creation is feature-gated per tenant: TenantSubscriptionService.assertFeatureAccess(tenantId, FEATURE_KEYS.FEATURE_API_KEYS) blocks tenants whose plan lacks the feature_api_keys entitlement; the root tenant (isRootTenant) is short-circuited and bypasses the gate.
- `api_key.service.ts:list/getById/create/update/delete` — All CRUD goes through tenantDataSourceFor(tenantId) and filters where:{tenantId}, so each tenant has its own isolated set of api_keys rows; cache keys are namespaced by tenantId (api_key:tenant:{tenantId}:{apiKeyId}).
- `api_key.service.ts:generateRawKey` — The raw key string embeds a per-tenant prefix derived from the tenantId (first 8 hex chars of the dashless tenantId) into the sk_live_{prefix}_{secret} format.
- `api_key.service.ts:verifyFromAuthHeader` — When a tenantId is supplied, verification rejects keys whose key.tenantId does not match, pinning a verified key to a specific tenant (used by SCIM / M2M callers). Note: the underlying verify() lookup uses the global getDataSource() and matches by keyHash across all tenants, so verification itself is not tenant-scoped at the DB level.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| apiKeyNegativeCacheTtlSeconds is declared as a UI settings field but is never read by the service; NEGATIVE_CACHE_TTL is hardcoded as Math.min(60, API_KEY_CACHE_TTL) from the global env value, so the negative-cache window is identical for every tenant and the declared setting has no effect. | `api_key.settings.fields.ts (API_KEY_SETTINGS_FIELDS apiKeyNegativeCacheTtlSeconds) / api_key.service.ts (NEGATIVE_CACHE_TTL, line 17)` | The field exists specifically to let a tenant tune how long missing-key lookups are negatively cached (credential-stuffing defense), but no SettingService.getValue call wires it in. Reading it per request tenant would make the declared setting functional and let tenants tune their own attack-surface window. | `apiKeyNegativeCacheTtlSeconds` |
| API_KEY_CACHE_TTL (positive cache TTL for valid keys) is sourced only from the global env.TENANT_CACHE_TTL (default 300s) and applied uniformly to all tenants. | `api_key.service.ts (API_KEY_CACHE_TTL, line 16)` | Positive lookup-cache freshness vs. Redis load is currently a single global deployment value. It could plausibly be per-tenant so high-traffic tenants tune it independently, but it is reasonable to keep global for operational consistency and to bound Redis memory — list as intentional-global rather than a strong candidate. | `apiKeyCacheTtlSeconds` |
| Default/allowed API key scopes are a fixed global enum (read, write, admin, scim:read, scim:write) with no per-tenant restriction; any tenant can mint admin- or scim-scoped keys regardless of plan tier. | `api_key.enums.ts (API_KEY_SCOPES / ApiKeyScopeEnum) consumed in api_key.service.ts:create` | Plan tiers or security policies might want to restrict which scopes a given tenant can grant (e.g. only paid plans may issue scim:* tokens). Today scopes are validated only against the global enum, not against any per-tenant policy, so this is a plausible per-tenant gating point. | `apiKeyAllowedScopes` |
| There is no per-tenant cap on the number of active API keys or a default key expiry/rotation policy; create() places no limit and expiresAt defaults to null (never expires). | `api_key.service.ts:create (no count check; expiresAt: input.expiresAt ? ... : null)` | Many SaaS products bound key count per plan and enforce a maximum/forced expiry for security. Both are currently unbounded and identical for all tenants, making them natural per-tenant policy settings. | `apiKeyMaxActiveKeys` |

---

## Dependencies

Requires: `db`, `env`, `common`. At runtime also uses `redis` (cache/single-flight), `tenant_subscription` (feature gating), `tenant` (root-tenant check), and `webhook` (event dispatch).
