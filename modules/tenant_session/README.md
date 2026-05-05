# tenant_session module

Tenant authentication and authorization for API routes and server actions. Validates tenant status and membership, checks role permissions, caches membership for 5 minutes.

---

## Files

| File | Purpose |
|---|---|
| `tenant_session.service.ts` | Core: validate, authorize, list user tenants |
| `tenant_session.service.next.ts` | Next.js server action wrappers |
| `tenant_session.messages.ts` | Error/success message strings |
| `tenant_session.setting.keys.ts` | Setting key constants |

---

## Usage in API Routes

```typescript
import TenantSessionService from '@/modules/tenant_session/tenant_session.service';

// Validate that the current user has at least USER access to this tenant
const { member, tenant } = await TenantSessionService.authorize(tenantId, userId, 'USER');

// Require admin access
const { member, tenant } = await TenantSessionService.authorize(tenantId, userId, 'ADMIN');
```

## Usage in Server Actions (Next.js)

```typescript
import { withTenantSession } from '@/modules/tenant_session/tenant_session.service.next';

export const myAction = withTenantSession(async ({ tenant, member }, data) => {
  // tenant and member are guaranteed to be valid
});
```

---

## Caching

Membership data is cached in Redis for 5 minutes per `(tenantId, userId)` pair. Cache is invalidated when membership changes.

---

## List User Tenants

```typescript
const tenants = await TenantSessionService.listForUser(userId);
// Returns all tenants the user is an ACTIVE member of
```
