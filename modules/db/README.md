# db

TypeORM `DataSource` factory for the two-schema multi-tenant model: a single **system** schema plus one **tenant** schema per tenant (cached, lazily initialised).

## Public API

| Export | Source | Use |
|---|---|---|
| `getSystemDataSource()` | [db.system.ts](db.system.ts) | Returns the initialised system DataSource. Idempotent. |
| `SystemDataSource` | [db.system.ts](db.system.ts) | The raw DataSource instance (rarely needed — prefer the getter). |
| `tenantDataSourceFor(tenantId)` | [db.tenant.ts](db.tenant.ts) | Returns the DataSource for a specific tenant. Cached per tenant. |
| `getDefaultTenantDataSource()` | [db.tenant.ts](db.tenant.ts) | DataSource for the wildcard/default tenant DB (used in single-DB setups). |
| `clearTenantDsCache(tenantId?)` | [db.tenant.ts](db.tenant.ts) | Drop one tenant from the cache or clear it entirely. |
| `TenantDatabase` | [entities/tenant_database.entity.ts](entities/tenant_database.entity.ts) | Entity that maps `tenantId → { connectionUrl, schema }`. |
| `parseDbUrl(url)` | [db.utils.ts](db.utils.ts) | Splits a Postgres URL into `{ url, schema }`. |

## Schema split

- **System schema** ([db.system.ts](db.system.ts)) owns: `User`, `UserProfile`, `UserSecurity`, `UserPreferences`, `UserSession`, `UserSocialAccount`, `PushSubscription`, `Setting`, `SubscriptionPlan`, `PlanFeature`, `AuditLog` (system), `Coupon`, `SystemWebhook`, `SystemWebhookDelivery`, `TenantDatabase`.
- **Tenant schema** ([db.tenant.ts](db.tenant.ts)) owns: `Tenant`, `TenantDomain`, `TenantMember`, `TenantInvitation`, `TenantSetting`, `TenantSubscription`, `Payment`, `PaymentTransaction`, `TenantAuditLog`, `ApiKey`, `CouponRedemption`, `Webhook`, `WebhookDelivery`, `SamlConfig`.

When you add a new entity, register it in the appropriate file's `SYSTEM_ENTITIES` or `TENANT_ENTITIES` array.

## Usage

```ts
import { getSystemDataSource, tenantDataSourceFor } from "@/modules/db";

// system scope
const ds = await getSystemDataSource();
const users = await ds.getRepository(User).find();

// tenant scope
const tds = await tenantDataSourceFor(tenantId);
const members = await tds.getRepository(TenantMember).find();
```

## Connection URLs

Driven by `SYSTEM_DATABASE_URL` and `TENANT_DATABASE_URL` env vars. Per-tenant override URLs are stored in the `TenantDatabase` row (system schema).

## Rules

- No `next/*`, no `react`. Service-layer only.
- Always **await** the data-source helpers — they perform lazy `initialize()` on first call.
- Tests mock these helpers; production code never instantiates `new DataSource()` directly.
