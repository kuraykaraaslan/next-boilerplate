# tenant_domain module

Custom domain management with DNS verification (TXT or CNAME). Enforces domain limits, caches in Redis, supports primary domain designation and status tracking.

---

## Files

| File | Purpose |
|---|---|
| `tenant_domain.service.ts` | Core: create, verify, activate, delete, list |
| `dns_verification.service.ts` | DNS lookup for TXT and CNAME verification |
| `tenant_domain.types.ts` | `TenantDomain`, `CreateTenantDomainInput` |
| `tenant_domain.dto.ts` | Zod DTOs |
| `tenant_domain.enums.ts` | `DomainStatus`, `VerificationMethod` enums |
| `tenant_domain.messages.ts` | Error/success message strings |
| `entities/tenant_domain.entity.ts` | TypeORM entity |

---

## Domain Status

| Status | Meaning |
|---|---|
| `PENDING` | Added, awaiting DNS verification |
| `VERIFIED` | DNS check passed |
| `ACTIVE` | Verified and serving traffic |
| `INACTIVE` | Manually disabled |

---

## Verification Methods

| Method | What to add in DNS |
|---|---|
| `TXT` | `_verify.yourdomain.com` → `TXT "<token>"` |
| `CNAME` | `yourdomain.com` → `CNAME tenants.yoursaas.com` |

---

## Usage

```typescript
import TenantDomainService from '@/modules/tenant_domain/tenant_domain.service';

// Add a domain
const domain = await TenantDomainService.create(tenantId, {
  domain: 'app.acme.com',
  verificationMethod: 'TXT',
});
// domain.verificationToken — show this to the user

// Trigger DNS verification
await TenantDomainService.verify(tenantId, domain.id);

// Set as primary
await TenantDomainService.setPrimary(tenantId, domain.id);
```

---

## API Routes

```
GET    /tenant/[tenantId]/api/domains
POST   /tenant/[tenantId]/api/domains
POST   /tenant/[tenantId]/api/domains/[id]/verify
PUT    /tenant/[tenantId]/api/domains/[id]
DELETE /tenant/[tenantId]/api/domains/[id]
```

Requires `tenant:admin` scope. Domain limits enforced via `tenant_subscription` feature `max_domains`.
