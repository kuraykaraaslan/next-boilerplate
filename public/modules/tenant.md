# Tenant

- **id:** `tenant`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant/`
- **tags:** tenant, core
- **icon:** `fas fa-building`
- **hasNextLayer:** true

Tenant CRUD, lifecycle (active/suspended/deleted), soft-deletion service. Foundation of multi-tenancy.

## Dependencies

- **requires:** `db`, `env`, `logger`, `common`

## Services

- `tenant.deletion.service.ts`
- `tenant.service.ts`

## DTOs

- `tenant.dto.ts`

## Entities

- `tenant.entity.ts`

## Enums

- `tenant.enums.ts`

## Message keys

- `tenant.messages.ts`

## Setting keys

- `tenant.setting.keys.ts`

## Jobs

- `tenant.deletion.job.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/tenants`
- `tenant` GET/PUT/DELETE `/tenant/[tenantId]/api/tenants/[targetTenantId]`
- `tenant` POST `/tenant/[tenantId]/api/tenants/[targetTenantId]/deletion-request`
- `tenant` POST `/tenant/[tenantId]/api/tenants/create`

## TypeORM entities

- `Tenant` (tenant) — `modules/tenant/entities/tenant.entity.ts`

## Next layer (modules_next/) surface

- `tenant/tenant.constants` _(ui)_
- `tenant/ui/CreateTenantForm` _(ui, client)_
- `tenant/ui/TenantSelectorCard` _(ui, client)_

## README

# tenant module

Multi-tenant organization management. Creates, updates, deletes tenants. Auto-provisions a personal tenant for every new user.

The **root tenant** (`ROOT_TENANT_ID = 00000000-0000-4000-8000-000000000000`, name `"Platform"`) is a real tenant row that owns platform-level configuration (global users, plans, coupons, system audit logs, super-admin settings). A super-admin is any `TenantMember` of the root tenant with `memberRole = 'ADMIN'`. There is no separate "system" scope — every request resolves to a tenant.

---

## Files

| File | Purpose |
|---|---|
| `tenant.service.ts` | Core: CRUD operations, personal tenant provisioning |
| `tenant.constants.ts` | `ROOT_TENANT_ID`, `ROOT_TENANT_NAME`, `isRootTenant()` |
| `tenant.types.ts` | `Tenant`, `CreateTenantInput`, `UpdateTenantInput` |
| `tenant.dto.ts` | Zod DTOs |
| `tenant.enums.ts` | `TenantStatus` enum |
| `tenant.messages.ts` | Error/success message strings |
| `tenant.setting.keys.ts` | Setting key constants |
| `entities/tenant.entity.ts` | TypeORM entity |
| `dictionaries/` | Localization (EN, ES, TR) |
| `ui/` | Tenant switcher and management UI components |

---

## Tenant Status

| Status | Meaning |
|---|---|
| `ACTIVE` | Fully operational |
| `INACTIVE` | Disabled, members cannot access |
| `SUSPENDED` | Admin-suspended, same as inactive |

---

## Usage

```typescript
import TenantService from '@/modules/tenant/tenant.service';

// Create a tenant
const tenant = await TenantService.create({
  name: 'Acme Corp',
  description: 'Our main workspace',
}, creatorUserId);

// Get by ID
const tenant = await TenantService.getById(tenantId);

// Update
await TenantService.update(tenantId, { name: 'Acme Inc' });

// Delete
await TenantService.delete(tenantId);

// List tenants for a user
const tenants = await TenantService.getByUserId(userId);
```

---

## Personal Tenant

When a new user registers, a personal tenant is automatically created for them. This tenant cannot be deleted.

---

## Auto-seed on create

Every newly created tenant (including the personal tenant auto-provisioned at user signup) starts with a minimal, functional default catalog rather than an empty one. The seed runs inside `TenantService.create()` and `TenantService.provisionPersonal()`, after the tenant row is committed.

What is seeded:

| Step | Source | Result |
|---|---|---|
| 1. Default plan | `TenantSubscriptionService.createPlan()` | A `"Free"` SubscriptionPlan: `monthlyPrice=0`, `yearlyPrice=0`, `currency='USD'`, `trialDays=0`, `isDefault=true`, `status='ACTIVE'`. |
| 2. Subscription | `TenantSubscriptionService.assignPlan()` | A `TenantSubscription` row binding the new tenant to the just-created Free plan (`billingInterval='MONTHLY'`). |
| 3. Defaults | `SettingService.updateMany()` | Setting rows: `language='en'`, `dateFormat='YYYY-MM-DD'`, `timeFormat='HH:mm'`, `timezone='UTC'`. |

Rules:

- **Best-effort, not atomic.** Each step is wrapped in `try/catch`. If the plan seed fails the tenant is still created — only a `Logger.warn` is emitted. The tenant create is the priority; downstream seeds can be re-run by admin tooling.
- **Skipped for root.** `isRootTenant(tenantId)` short-circuits the seed — the root tenant is seeded by dedicated seed scripts.
- **Opt-out.** `CreateTenantDTO` accepts an optional `defaults: { skipPlan?, skipSubscription?, skipSettings? }` to disable individual steps. Default behaviour seeds everything.
- **Idempotent.** `SettingService.updateMany` upserts by key, and the seed is skipped when the tenant already has a plan (because `assignPlan` updates the existing subscription row).
- **Does not copy from root.** The seed installs hardcoded minimum-functional defaults — it never reads the root tenant's plan/setting catalog.

```typescript
// Default behaviour — seeds plan, subscription, settings
await TenantService.create({ name: 'Acme', description: null, region: 'TR' });

// Opt out of plan/subscription (e.g. importing an existing org)
await TenantService.create({
  name: 'Imported',
  description: null,
  region: 'TR',
  defaults: { skipPlan: true, skipSubscription: true },
});
```

---

## API Routes

```
GET    /api/tenants
POST   /api/tenants
GET    /tenant/[tenantId]/api/info
PUT    /tenant/[tenantId]/api/info
DELETE /tenant/[tenantId]/api/info
```

---

## Caching

`getById(tenantId)` is cached in Redis under `tenant:id:{tenantId}` (TTL = `TENANT_CACHE_TTL`, default 5 min). `update` and `delete` clear the key. Tenant lookup runs on nearly every request, so this drops a hot DB query down to a Redis GET.

TTL is jittered ±10% and reads are wrapped in in-process single-flight (`modules/redis/redis.cache.ts`) so a wave of cold-cache requests for the same tenant runs only one DB query.
