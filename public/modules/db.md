# Database

- **id:** `db`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/db/`
- **tags:** infrastructure, core, database
- **icon:** `fas fa-database`
- **hasNextLayer:** false

TypeORM DataSource factories for the dual-schema model (system + per-tenant). All entities are registered here.

## Dependencies

- **requires:** `env`

## Entities

- `tenant_database.entity.ts`

## TypeORM entities

- `TenantDatabase` (system) — `modules/db/entities/tenant_database.entity.ts`

## README

# db

TypeORM `DataSource` factories for the multi-tenant model. The codebase keeps two structural buckets — *shared* (User, Setting, SubscriptionPlan, …) and *per-tenant* (Tenant, TenantMember, Payment, ApiKey, …) — but in the default single-DB setup both factories point at the **same** Postgres schema. Splitting databases later is an env-only change.

## Public API

| Export | Source | Use |
|---|---|---|
| `getSystemDataSource()` | [db.system.ts](db.system.ts) | Returns the initialised DataSource for shared / platform-config tables. Idempotent. |
| `SystemDataSource` | [db.system.ts](db.system.ts) | The raw DataSource instance (rarely needed — prefer the getter). |
| `tenantDataSourceFor(tenantId)` | [db.tenant.ts](db.tenant.ts) | Returns the DataSource for a specific tenant. Cached per tenant. |
| `getDefaultTenantDataSource()` | [db.tenant.ts](db.tenant.ts) | DataSource for the wildcard/default tenant DB (used in single-DB setups). |
| `clearTenantDsCache(tenantId?)` | [db.tenant.ts](db.tenant.ts) | Drop one tenant from the cache or clear it entirely. |
| `TenantDatabase` | [entities/tenant_database.entity.ts](entities/tenant_database.entity.ts) | Entity that maps `tenantId → { connectionUrl, schema }`. |
| `parseDbUrl(url)` | [db.utils.ts](db.utils.ts) | Splits a Postgres URL into `{ url, schema }`. |

## Entity buckets

- **Shared / platform** ([db.system.ts](db.system.ts)) owns: `User`, `UserProfile`, `UserSecurity`, `UserPreferences`, `UserSession`, `UserSocialAccount`, `PushSubscription`, `Setting`, `SubscriptionPlan`, `PlanFeature`, `AuditLog`, `Coupon`, `SystemWebhook`, `SystemWebhookDelivery`, `SystemSamlConfig`, `SigningCertificate`, `TrustListEntry`, `TenantDatabase`.
- **Per-tenant** ([db.tenant.ts](db.tenant.ts)) owns: `Tenant`, `TenantDomain`, `TenantMember`, `TenantInvitation`, `TenantSetting`, `TenantSubscription`, `Payment`, `PaymentTransaction`, `TenantAuditLog`, `ApiKey`, `CouponRedemption`, `Webhook`, `WebhookDelivery`, `SamlConfig`.

When you add a new entity, register it in the appropriate file's `SYSTEM_ENTITIES` or `TENANT_ENTITIES` array. The "shared" naming is historical — every row physically lives in the same DB as the per-tenant tables unless an operator points `SYSTEM_DATABASE_URL` and `TENANT_DATABASE_URL` at different connections.

## Usage

```ts
import { getSystemDataSource, tenantDataSourceFor } from "@/modules/db";

// Shared / platform entities
const ds = await getSystemDataSource();
const users = await ds.getRepository(User).find();

// Per-tenant entities
const tds = await tenantDataSourceFor(tenantId);
const members = await tds.getRepository(TenantMember).find();
```

## Connection URLs

Driven by `SYSTEM_DATABASE_URL` and `TENANT_DATABASE_URL`. In single-DB setups set both to the same URL. Per-tenant override URLs (separate DBs per customer) are stored in the `TenantDatabase` row.

## Rules

- No `next/*`, no `react`. Service-layer only.
- Always **await** the data-source helpers — they perform lazy `initialize()` on first call.
- Tests mock these helpers; production code never instantiates `new DataSource()` directly.
