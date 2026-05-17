# API Key

- **id:** `api_key`
- **tier:** platform
- **version:** 1.0.0
- **dir:** `modules/api_key/`
- **tags:** platform, security
- **icon:** `fas fa-key`
- **hasNextLayer:** false

Tenant-scoped API keys for programmatic access (hashed at rest, scope-bound).

## Dependencies

- **requires:** `db`, `env`, `common`

## Services

- `api_key.service.ts`

## DTOs

- `api_key.dto.ts`

## Entities

- `api_key.entity.ts`

## Enums

- `api_key.enums.ts`

## Message keys

- `api_key.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/api-keys`
- `tenant` PUT/DELETE `/tenant/[tenantId]/api/api-keys/[apiKeyId]`
- `tenant` POST `/tenant/[tenantId]/api/api-keys/verify`

## TypeORM entities

- `ApiKey` (tenant) — `modules/api_key/entities/api_key.entity.ts`

## README

# api_key module

Manages API keys for tenant authentication. Generates, validates, and hashes keys with scopes and expiration tracking.

---

## Files

| File | Purpose |
|---|---|
| `api_key.service.ts` | Core logic: create, validate, revoke, list API keys |
| `api_key.types.ts` | `ApiKey`, `SafeApiKey` types |
| `api_key.dto.ts` | `CreateApiKeyDTO`, `ListApiKeysDTO` |
| `api_key.enums.ts` | `ApiKeyScope` enum |
| `api_key.messages.ts` | Error/success message strings |
| `entities/api_key.entity.ts` | TypeORM entity |

---

## Key Concepts

- The raw key is shown **once** at creation — only its hash is stored
- `SafeApiKey` omits the hash and is safe to return in API responses
- Scopes control what the key can access

## Scopes

| Scope | Access |
|---|---|
| `READ` | GET endpoints only |
| `WRITE` | Create/update operations |
| `ADMIN` | Full tenant admin access |

---

## Usage

```typescript
import ApiKeyService from '@/modules/api_key/api_key.service';

// Create a key
const { key, apiKey } = await ApiKeyService.create(tenantId, {
  name: 'CI Bot',
  scopes: ['READ', 'WRITE'],
  expiresAt: new Date('2027-01-01'),
});
// key is the raw secret — show once, never store

// Validate an incoming key
const apiKey = await ApiKeyService.validate(rawKey);
// throws if invalid or expired

// Revoke
await ApiKeyService.revoke(tenantId, apiKeyId);
```

---

## API Routes

```
GET    /tenant/[tenantId]/api/api-keys
POST   /tenant/[tenantId]/api/api-keys
DELETE /tenant/[tenantId]/api/api-keys/[id]
```

---

## Caching

API key lookups are cached in Redis (TTL = `TENANT_CACHE_TTL`, default 5 min):

| Key | Used by |
|---|---|
| `api_key:hash:{sha256(rawKey)}` | `verify(rawKey)` — hot path on every authenticated API request |
| `api_key:tenant:{tenantId}:{apiKeyId}` | `getById(tenantId, apiKeyId)` |

`update` and `delete` invalidate by `apiKeyId`, `keyHash`, and `tenantId+apiKeyId`. `create` clears the negative cache for the freshly-minted hash. `lastUsedAt` writes are intentionally fire-and-forget and do **not** invalidate — the value isn't security-critical and refreshing it would defeat the cache.

### Stampede + negative cache

- **TTL jitter (±10%)** spreads expirations so a burst of keys minted in the same second don't refill simultaneously.
- **In-process single-flight** (`modules/redis/redis.cache.ts`) dedupes concurrent loaders for the same key — if 100 requests miss on the same hash at the same time, only one DB query runs.
- **Negative cache** on `verify`: an unknown hash is cached as `__not_found__` for up to 60s. Credential-stuffing attempts against random hashes hit Redis, not the DB. `create` clears the negative key for the new hash, so freshly-minted keys are immediately usable.
