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
