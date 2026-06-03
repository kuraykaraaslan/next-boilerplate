# Api Key Module

Manages tenant-scoped API keys for programmatic authentication. Generates, hashes, and verifies keys with scopes and expiration tracking; creation is gated behind the `feature_api_keys` plan feature and isolated per tenant.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `ApiKey` | `api_keys` | One API key per row: `name`, `description`, SHA-256 `keyHash` (unique index), `scopes`, `isActive`, `lastUsedAt`, `expiresAt`, `createdByUserId`. Indexed by `tenantId`. |

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
| `api_key.seed.ts` | Demo-data seed (read/write, admin, SCIM, revoked keys) |
| `entities/api_key.entity.ts` | TypeORM entity |

---

## Key Concepts

- The raw key is shown **once** at creation — only its SHA-256 hash is stored (`keyHash`).
- Raw key format: `sk_live_{first 8 chars of tenantId}_{24 random bytes hex}` (`generateRawKey`).
- `SafeApiKey` omits `keyHash` and is the only shape returned to clients.
- Scopes control what the key can access; `verify` can optionally enforce a `requiredScope`.

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
| `verify(rawKey, requiredScope?)` | Hot-path validation across all tenants by `keyHash`: rejects unknown/inactive/expired keys and insufficient scope, fire-and-forget updates `lastUsedAt`. |
| `verifyFromAuthHeader(request, tenantId?, requiredScope?)` | Parses `Authorization: Bearer <key>`, calls `verify`, optionally pins to a tenant. Used by SCIM 2.0 and other machine-to-machine integrations. |
| `generateRawKey` / `hashKey` | Raw-key generation and SHA-256 hashing helpers. |

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
| PUT | `/tenant/[tenantId]/api/api-keys/[apiKeyId]` | Update name/description/active status |
| DELETE | `/tenant/[tenantId]/api/api-keys/[apiKeyId]` | Permanently revoke a key |

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
- **Negative cache** on `verify`: an unknown hash is cached as `__not_found__` for up to `NEGATIVE_CACHE_TTL` (`Math.min(60, API_KEY_CACHE_TTL)`). Credential-stuffing attempts against random hashes hit Redis, not the DB. `create` clears the negative key for the new hash, so freshly-minted keys are immediately usable.

---

## Security

- Raw keys are never stored — only their SHA-256 hash (`keyHash`, unique index) is persisted.
- `SafeApiKey` (the only client-facing shape) omits `keyHash`; the raw key is returned exactly once, from `create`.
- Creation is billing-gated for non-root tenants via `assertFeatureAccess(tenantId, FEATURE_API_KEYS)` (defense-in-depth on top of UI gating).
- `verify` rejects inactive (`KEY_INACTIVE`), expired (`KEY_EXPIRED`), unknown (`INVALID_KEY`), and under-scoped (`INSUFFICIENT_SCOPE`) keys.
- The negative cache blunts credential-stuffing by serving repeated unknown-hash guesses from Redis instead of the DB.

---

## Settings

Surfaced at `/tenant/[tenantId]/admin/api-keys/settings` (gear button in the API Keys page header) via the shared `ModuleSettingsPage` scaffold. UI field metadata: `api_key.settings.fields.ts`. The `env:TENANT_CACHE_TTL` deployment var is **not** exposed here.

| Key | Type | Notes |
|---|---|---|
| `apiKeyNegativeCacheTtlSeconds` | number | Negative-cache TTL for missing API keys (min 60s). |

Read/written via `GET/PUT /tenant/[tenantId]/api/admin-settings`. See `docs/ROADMAP_SETTINGS.md`.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages tenant-scoped API keys for programmatic authentication with feature gating and per-tenant credential isolation.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `apiKeyNegativeCacheTtlSeconds` | number | `60` | tenant | Negative-cache TTL for missing API keys (min 60s); shortens credential-stuffing attack surface. | `api_key.settings.fields.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `ApiKey` | `api_keys` | name, description, scopes, isActive, expiresAt, lastUsedAt, createdByUserId |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `api_key.service.ts:create` — Feature gating: non-root tenants must have FEATURE_API_KEYS enabled in their subscription plan via TenantSubscriptionService.assertFeatureAccess(); root tenant bypasses this check.
- `api_key.service.ts:list` — Returns only API keys belonging to the specified tenant, queried from that tenant's data source.
- `api_key.service.ts:getById` — Retrieves a single API key scoped to the tenant; separate Redis cache key includes tenantId.
- `api_key.service.ts:update` — Updates only keys belonging to the specified tenant; clears tenant-scoped cache.
- `api_key.service.ts:delete` — Deletes only keys belonging to the specified tenant; clears tenant-scoped cache.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| NEGATIVE_CACHE_TTL hardcoded to Math.min(60, API_KEY_CACHE_TTL) | `api_key.service.ts:13` | Setting apiKeyNegativeCacheTtlSeconds is declared but not read; NEGATIVE_CACHE_TTL is computed from global API_KEY_CACHE_TTL and should be per-tenant to allow tenants to tune credential-stuffing defense independently. | `apiKeyNegativeCacheTtlSeconds` |
| API_KEY_CACHE_TTL sourced only from env.TENANT_CACHE_TTL (global default 300s) | `api_key.service.ts:12` | Positive cache TTL for valid API keys is a global deployment setting; could plausibly be per-tenant to let high-traffic tenants tune Redis load vs. freshness trade-off independently, though this is intentionally global for consistency. | — |
| Key format (sk_live_{tenantPrefix}_{secret}) hardcoded in generateRawKey() | `api_key.service.ts:generateRawKey` | Key format is fixed; intentionally global for interoperability, not a tenant-variability concern. | — |
| Scope enum (read, write, admin, scim:read, scim:write) globally defined | `api_key.enums.ts` | Scopes are platform-wide; could plausibly restrict available scopes per tenant (e.g., SCIM integration only for certain tenants), but currently all scopes are available to all tenants. | — |

---

## Dependencies

Requires: `db`, `env`, `common`. At runtime also uses `redis` (cache/single-flight), `tenant_subscription` (feature gating), `tenant` (root-tenant check), and `webhook` (event dispatch).
