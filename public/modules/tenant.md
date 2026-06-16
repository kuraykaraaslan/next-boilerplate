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
- `tenant.onboarding.service.ts`
- `tenant.read.service.ts`
- `tenant.service.ts`
- `tenant.write.service.ts`

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
- `tenant` GET/POST `/tenant/[tenantId]/api/tenants/[targetTenantId]/subscription`
- `tenant` POST `/tenant/[tenantId]/api/tenants/create`

## TypeORM entities

- `Tenant` (tenant) — `modules/tenant/server/entities/tenant.entity.ts`

## Next layer (modules_next/) surface

- `tenant/ui/create-tenant-form.component` _(ui, client)_
- `tenant/ui/tenant-members-table.component` _(ui, client)_
- `tenant/ui/tenant-selector-card.component` _(ui, client)_
- `tenant/ui/tenant-subscription-card.component` _(ui, client)_
- `tenant/ui/tenant.constants` _(ui)_
- `tenant/ui/tenants-target-tenant-id.page` _(ui, client)_
- `tenant/ui/tenants.page` _(ui, client)_

## README

# Tenant Module

The foundation of multi-tenancy. Owns the global tenant registry — CRUD, lifecycle (`ACTIVE`/`SUSPENDED`/`PENDING_DELETION`), soft-delete grace + hard-purge — where each row **is** a tenant's identity. On creation it bootstraps a small set of per-tenant defaults (a cloned platform plan, if configured, plus locale settings).

The **root tenant** (`ROOT_TENANT_ID = 00000000-0000-4000-8000-000000000000`, name `"Platform"`) is a real tenant row that owns platform-level configuration (global users, plans, coupons, system audit logs, super-admin settings). A super-admin is any `TenantMember` of the root tenant with `memberRole = 'ADMIN'`. There is no separate "system" scope — every request resolves to a tenant.

---

## Entities

| Entity | Table | DB | Description |
|---|---|---|---|
| `Tenant` | `tenants` | system | The global tenant registry. `tenantId` is its **own** primary key (the tenant's identity), not a tenant-scope FK. Carries `name`, `description`, `tenantStatus`, soft-delete (`deletedAt`), and the deletion-grace columns `deletionRequestedAt` / `deleteAfter`. |

`SafeTenant` (`tenant.types.ts`) is the API-facing shape — it omits `deletedAt` and may include the tenant's `domains` (joined from the `tenant_domain` module).

---

## Services / Responsibilities

| File | Responsibility |
|---|---|
| `tenant.service.ts` | Core CRUD: `getAll` (paged + search, system DataSource), `getById` (Redis-cached), `create`, `update`, `delete` (soft, sets `deletedAt`), `provisionPersonal` (auto-tenant for a new user, makes the user `OWNER`), and the private `seedDefaults` bootstrap. Fires platform/tenant webhook events. |
| `tenant.deletion.service.ts` | Soft-delete lifecycle: `requestDeletion` (status → `PENDING_DELETION`, sets `deleteAfter = now + 30d`), `cancelDeletion` (back to `ACTIVE`, clears the horizon), and `purgeExpiredTenants` (hard `softRemove` of rows past `deleteAfter`). |
| `tenant.deletion.job.ts` | BullMQ queue/worker (`tenant-purge`) that runs `purgeExpiredTenants`. `scheduleTenantPurgeJob` registers a repeating job (default cron `0 4 * * *`, daily 04:00). |
| `tenant.seed.ts` | Registry seed (`seedTenant`) — writes the active demo tenant plus pending/suspended demo rows via `ctx.systemRepo`. |

### Lifecycle / statuses

`TenantStatusEnum` (`tenant.enums.ts`) defines `ACTIVE`, `INACTIVE`, `PENDING`, `SUSPENDED`, `DELETED`, `ARCHIVED`. The deletion flow additionally writes `PENDING_DELETION` to `tenantStatus` at runtime. New tenants start `ACTIVE`.

---

## Auto-seed on create

`create` and `provisionPersonal` both call the private `seedDefaults(tenantId, defaults?)` after the tenant row is committed. It is best-effort and idempotent:

| Step | Source | Result |
|---|---|---|
| 1. Default plan | `TenantSubscriptionService.getDefaultPlanId` → `assignPlatformPlan` | If the operator configured a default platform plan, it is **cloned** (category/product/plan/feature chain) into the new tenant and assigned for free (`priceOverride: 0`). |
| 2. Defaults | `SettingService.updateMany` | Setting rows: `language='en'`, `dateFormat='YYYY-MM-DD'`, `timeFormat='HH:mm'`, `timezone='UTC'`. |

Rules:

- **Best-effort, not atomic.** Each step is wrapped in `try/catch`; a failure only emits a `Logger.warn` and never blocks tenant creation or the other step.
- **Skipped for root.** `isRootTenant(tenantId)` short-circuits the whole seed — the root tenant is seeded by dedicated seed scripts.
- **Opt-out.** `CreateTenantDTO` accepts an optional `defaults: { skipPlan?, skipSubscription?, skipSettings? }`. The plan step runs only when **neither** `skipPlan` nor `skipSubscription` is set.
- **No inline Free plan.** The old inline `"Free"` plan seed is disabled (`DEFAULT_FREE_PRODUCT` / `DEFAULT_FREE_PLAN_BILLING` are kept but `void`'d): plans now wrap a `StoreProduct`, so a brand-new tenant has no catalog to bind to. The seed clones the operator-configured ROOT default plan instead.

```typescript
import TenantService from '@/modules/tenant/tenant.service';

// Default behaviour — clones the default plan (if configured) + seeds settings
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

## Usage

```typescript
import TenantService from '@/modules/tenant/tenant.service';

// Create a tenant (auto-seeds defaults)
const tenant = await TenantService.create({ name: 'Acme Corp', description: 'Our main workspace', region: 'TR' });

// Get by ID (Redis-cached)
const found = await TenantService.getById(tenant.tenantId);

// Paged list with optional search
const { tenants, total } = await TenantService.getAll({ page: 0, pageSize: 10, search: null, tenantId: null });

// Update
await TenantService.update(tenant.tenantId, { name: 'Acme Inc' });

// Soft-delete (sets deletedAt)
await TenantService.delete(tenant.tenantId);
```

A new user's personal tenant is provisioned via `TenantService.provisionPersonal(userId, email)`, which also creates an `OWNER` `TenantMember` for them.

---

## Webhook events

`create`/`update`/`delete` dispatch via `WebhookService`:

- `tenant.created` / `tenant.deleted` → platform-wide (root-tenant webhooks).
- `tenant.updated` → the tenant's own webhooks.
- `tenant.suspended` → platform-wide, additionally raised when an `update` transitions a tenant **into** `SUSPENDED`.

---

## API Routes (tenant-scoped)

| Method | Path | Description |
|---|---|---|
| GET | `/tenant/[tenantId]/api/tenants` | List tenants (paged, searchable) |
| POST | `/tenant/[tenantId]/api/tenants` · `…/tenants/create` | Create a tenant |
| GET | `/tenant/[tenantId]/api/tenants/[targetTenantId]` | Get a tenant |
| PUT | `/tenant/[tenantId]/api/tenants/[targetTenantId]` | Update a tenant |
| DELETE | `/tenant/[tenantId]/api/tenants/[targetTenantId]` | Soft-delete a tenant |
| POST | `/tenant/[tenantId]/api/tenants/[targetTenantId]/deletion-request` | Request (or cancel) soft-deletion with the 30-day grace window |
| GET | `/tenant/[tenantId]/api/users/[userId]/tenants` · `…/auth/me/tenants` | List a user's tenants |
| POST | `/tenant/[tenantId]/api/cron/purge-expired-tenants` | Hard-purge sweep — auth via `CRON_SECRET` bearer token (serverless trigger for `purgeExpiredTenants`) |

---

## Settings

The seed writes four per-tenant locale defaults (`language`, `dateFormat`, `timeFormat`, `timezone`) via `SettingService.updateMany`.

`tenant.setting.keys.ts` declares a broader `TenantGeneralSettingKeySchema` / `TENANT_GENERAL_KEYS` (14 keys: `tenantName`, `tenantDescription`, `logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `accentColor`, `contactEmail`, `contactPhone`, `contactAddress`, `timezone`, `language`, `dateFormat`, `timeFormat`). Only the four locale keys are wired with a write-side default today — see *Tenant Variability* below.

---

## Caching

`getById(tenantId)` is cached in Redis under `tenant:id:{tenantId}` (TTL = `TENANT_CACHE_TTL`, default 5 min, from `env.TENANT_CACHE_TTL`). `update` and `delete` clear the key. Tenant lookup runs on nearly every request, so this drops a hot DB query down to a Redis GET. The TTL is jittered (`jitter`) and reads are wrapped in in-process single-flight (`singleFlight`, `modules/redis`) so a wave of cold-cache requests for the same tenant runs only one DB query.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The tenant module is the foundation of multi-tenancy: it owns the global tenant registry (CRUD, lifecycle ACTIVE/SUSPENDED/PENDING_DELETION, soft-delete grace + purge) where each row IS a tenant's identity, and it seeds a small set of per-tenant default settings on creation.

### Per-tenant settings

| Key | Type | Default | Scope | Controls | Read in |
|---|---|---|---|---|---|
| `language` | string | `en` | tenant | Tenant's default UI/content language; seeded per real tenant in seedDefaults via SettingService.updateMany. | `tenant.service.ts` |
| `dateFormat` | string | `YYYY-MM-DD` | tenant | Tenant's default date display format; seeded per real tenant in seedDefaults. | `tenant.service.ts` |
| `timeFormat` | string | `HH:mm` | tenant | Tenant's default time display format; seeded per real tenant in seedDefaults. | `tenant.service.ts` |
| `timezone` | string | `UTC` | tenant | Tenant's default timezone; seeded per real tenant in seedDefaults. | `tenant.service.ts` |

*Scope: `tenant` = real tenants override · `root` = platform-only default (not per-tenant).*

### Per-tenant behavior

- `tenant.service.ts:seedDefaults` — On creation each non-root tenant is bootstrapped per-tenant: a default platform plan (if the operator configured one via TenantSubscriptionService.getDefaultPlanId) is cloned and assigned for free, and DEFAULT_TENANT_SETTINGS are written under that tenantId. Skipped entirely for ROOT_TENANT_ID and gated by per-call defaults flags (skipPlan/skipSubscription/skipSettings).
- `tenant.service.ts:update` — Lifecycle/webhook behavior branches per tenant: tenant.updated fires to that tenant's own webhooks, and a transition into SUSPENDED additionally raises the platform-wide tenant.suspended event.
- `tenant.deletion.service.ts:requestDeletion` — Each tenant gets its own deleteAfter horizon (now + 30-day grace) stored on its row, driving an independent per-tenant hard-purge schedule swept by purgeExpiredTenants.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| TENANT_GENERAL_KEYS declares 14 tenant-branding/locale setting keys (tenantName, tenantDescription, logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, contactEmail, contactPhone, contactAddress, timezone, language, dateFormat, timeFormat) but the module has NO *.settings.fields.ts and no service ever reads them — declared-but-unwired per-tenant config. | `tenant.setting.keys.ts (TenantGeneralSettingKeySchema)` | These are explicitly tenant-scoped (per-tenant name/branding/contact/locale), yet there is no UI metadata file and no SettingService.getValue read path, so a tenant admin cannot actually override them today; only language/dateFormat/timeFormat/timezone get write-side defaults seeded. | `tenantName` |
| DELETION_GRACE_DAYS hardcoded to 30 for every tenant's soft-delete grace window. | `tenant.deletion.service.ts (DELETION_GRACE_DAYS)` | The recovery/grace period before hard-purge is a policy that could reasonably differ per tenant (e.g. enterprise plans get a longer recovery window) but is a fixed global constant. | `tenantDeletionGraceDays` |
| Tenant hard-purge cron pattern hardcoded to '0 4 * * *' (daily 04:00). | `tenant.deletion.job.ts (scheduleTenantPurgeJob default cronPattern)` | Intentionally global: a single shared platform worker sweeps all tenants, so a per-tenant schedule is not meaningful — listed only for contrast. | — |
| DEFAULT_FREE_PRODUCT / DEFAULT_FREE_PLAN_BILLING starter-plan defaults (name 'Free Plan', basePrice 0, currency 'USD', MONTHLY, trialDays 0) hardcoded. | `tenant.service.ts (DEFAULT_FREE_PRODUCT / DEFAULT_FREE_PLAN_BILLING)` | Currently dead (void'd) — inline free-plan seed was disabled in favor of cloning an operator-configured ROOT default plan; the starter currency/trial defaults are platform-global, not per-tenant. Listed for contrast. | — |
| TENANT_CACHE_TTL (default 300s) governs how long getById caches a tenant row globally. | `tenant.service.ts (TENANT_CACHE_TTL)` | Intentionally global infra tuning sourced from env.TENANT_CACHE_TTL; caching the registry per-tenant TTL has no business meaning. Listed for contrast. | — |

---

## Dependencies

Requires: `db`, `env`, `logger`, `common`. At runtime also collaborates with `tenant_member` (personal-tenant ownership), `tenant_subscription` (default-plan cloning), `setting` (default settings), `webhook` (lifecycle events), `redis` (caching + BullMQ purge queue), and `tenant_domain` (`SafeTenant.domains`).
