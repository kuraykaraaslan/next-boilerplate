# Database

- **id:** `db`
- **tier:** infrastructure
- **version:** 1.0.0
- **dir:** `modules/db/`
- **tags:** infrastructure, core, database
- **icon:** `fas fa-database`
- **hasNextLayer:** false

TypeORM DataSource factory — single shared DB for all entities, optional per-tenant DB override via TenantDatabase.

## Dependencies

- **requires:** `env`

## Services

- `db.tenant-provision.service.ts`

## Entities

- `tenant_database.entity.ts`

## TypeORM entities

- `TenantDatabase` (system) — `modules/db/entities/tenant_database.entity.ts`

## README

# Db Module

Pure-infrastructure TypeORM `DataSource` factory. A single shared default `DataSource` (`getDataSource()`) backs every entity in the app; `tenantDataSourceFor(tenantId)` optionally routes a tenant to its own physical database when a `TenantDatabase` mapping row exists, otherwise it falls back to the default. No service layer, no settings.

---

## Public API

| Export | Source | Use |
|---|---|---|
| `getDataSource()` | [`db.ts`](db.ts) | Lazily initialized + cached default `DataSource`. For all callsites. Idempotent — first call runs `initialize()`. |
| `tenantDataSourceFor(tenantId)` | [`db.ts`](db.ts) | If a `TenantDatabase` row exists for the tenant, a separate `DataSource` to that DB (LRU cache, max `100`). Otherwise returns `getDataSource()`. |
| `clearTenantDsCache(tenantId)` | [`db.ts`](db.ts) | Evicts and destroys one tenant's per-tenant override `DataSource` from the cache. |
| `TenantDatabase` | [`entities/tenant_database.entity.ts`](entities/tenant_database.entity.ts) | `tenantId → databaseUrl` mapping row. |
| `parseDbUrl(url)` | [`db.utils.ts`](db.utils.ts) | Splits a Postgres URL into `{ url, schema }`, stripping the `?schema=` query param. |

`typeormLogging(nodeEnv)` (also in [`db.utils.ts`](db.utils.ts)) is an internal helper: returns `'all'` when `TYPEORM_LOG_QUERIES=1`, `['error','warn','schema','migration']` in development, and `['error']` otherwise.

---

## Entities

| Entity | Table | DB | Description |
|---|---|---|---|
| `TenantDatabase` | `tenant_databases` | system | `tenantId → databaseUrl` mapping for per-tenant physical-DB override. RLS-exempt (cross-tenant by design). |

`db.ts` also aggregates **every** application entity into a single `ENTITIES` array so one `DataSource` can resolve all repositories. As of the current code these are (owned by their respective modules, not by `db`):

`User`, `UserProfile`, `UserSecurity`, `UserPreferences`, `UserSession`, `UserSocialAccount`, `SigningCertificate`, `TrustListEntry`, `TenantDatabase`, `Tenant`, `TenantDomain`, `TenantMember`, `TenantInvitation`, `TenantSubscription`, `Payment`, `PaymentTransaction`, `AuditLog`, `ApiKey`, `CouponRedemption`, `Webhook`, `WebhookDelivery`, `SamlConfig`, `Setting`, `Coupon`, `SubscriptionPlan`, `PlanFeature`, `PushSubscription`, `Invoice`, `InvoiceLine`, `TenantUsage`, `UploadedFile`, `AiUsageLog`, `NotificationLog`, `StoreCategory`, `StoreCategorySpec`, `StoreProduct`, `StoreProductImage`, `StoreProductSpecValue`, `StoreVariantGroup`, `StoreVariantGroupItem`, `StoreBundle`, `StoreBundleItem`, `StoreVariationType`, `StoreVariationOption`, `StoreProductVariant`, `SeoMeta`, `MediaGallery`, `MediaGalleryItem`, `DynamicPage`, `DynamicPageTranslation`, `DynamicPageBlock`, `Fulfillment`, `FulfillmentItem`, `FulfillmentEvent`, `Cart`, `CartItem`, `ShippingMethod`, `ShippingRate`, `TaxClass`, `TaxRate`, `Wishlist`, `WishlistItem`, `ProductReview`, `ProductReviewVote`, `ReturnRequest`, `ReturnItem`, `ReturnEvent`, `LoyaltyAccount`, `LoyaltyTransaction`, `LoyaltyTier`.

> When a new entity is added anywhere in the app, register it in the `ENTITIES` array in [`db.ts`](db.ts).

---

## Connection URL

Single env var: `DATABASE_URL` (e.g. `postgresql://postgres:postgres@localhost:5432/next_boilerplate?schema=public`). `parseDbUrl` peels off the `?schema=` param into the `DataSource` `schema` option.

To allocate a dedicated DB to a tenant, insert a `{ tenantId, databaseUrl }` row into `tenant_databases`; `tenantDataSourceFor(tenantId)` then connects to that DB (and caches it). Without a row the tenant uses the shared default DB.

`DataSource` options are environment-derived, not per-tenant: `synchronize` is on only in development (`NODE_ENV === 'development'`), `logging` is driven by `typeormLogging`, and the per-tenant override cache is capped at `MAX_CACHED = 100` (oldest entry evicted + destroyed on overflow).

---

## Migrations

Raw, numbered SQL migrations under [`migrations/`](migrations) (see [`migrations/README.md`](migrations/README.md)), applied in order and idempotent where reasonable.

| # | File | Purpose |
|---|---|---|
| 001 | [`001_tenant_rls.sql`](migrations/001_tenant_rls.sql) | Postgres row-level security for tenant-scoped tables — defense-in-depth on top of service-layer `where: { tenantId }` guards. |
| 002 | [`002_drop_api_key_keyprefix.sql`](migrations/002_drop_api_key_keyprefix.sql) | Drops the display-only `keyPrefix` column from `api_keys` (only the SHA-256 `keyHash` is stored). |
| 003 | [`003_webhook_endpoint_capabilities.sql`](migrations/003_webhook_endpoint_capabilities.sql) | Adds webhook endpoint capability columns (custom headers, event filters, tags, circuit-breaker counters, IP allowlist, per-endpoint rate limit) + a `webhook_deliveries(event)` index. |

Apply with `psql "$DATABASE_URL" -f modules/db/migrations/001_tenant_rls.sql`. Development currently relies on `synchronize: true`; production should drive these through a real migration runner.

---

## Security

Migration `001_tenant_rls.sql` enables Postgres RLS on the tenant-scoped tables (`tenants`, `tenant_domains`, `tenant_members`, `tenant_invitations`, `tenant_subscriptions`, `tenant_usage`, `settings`, `audit_logs`, `api_keys`, `payments`, `payment_transactions`, `subscription_plans`, `plan_features`, `coupons`, `coupon_redemptions`, `webhooks`, `webhook_deliveries`, `saml_configs`, `push_subscriptions`, `uploaded_files`, `ai_usage_logs`, `notification_logs`) as defense-in-depth.

**Runtime contract:** once RLS is applied, every connection MUST issue `SET LOCAL app.current_tenant = '<tenantId>'` on checkout — without it RLS-protected `SELECT`s return 0 rows. Cron jobs / CLI tooling that legitimately need cross-tenant access connect as a `BYPASSRLS` role (or `SET LOCAL app.bypass_rls = 'on'`). The User family, e-signature, trust-list, and `tenant_databases` tables are intentionally left RLS-exempt (cross-tenant by design; the boundary there is the JWT/session).

> Note: `tenantDataSourceFor` does **not** currently wire this `SET LOCAL` hook (see *Tenant Variability* below), so the RLS layer is dormant and isolation today rests entirely on the application-layer `where: { tenantId }` guards.

---

## Usage

```ts
import { getDataSource, tenantDataSourceFor } from "@/modules/db";
import { User } from "@/modules/user/entities/user.entity";
import { TenantMember } from "@/modules/tenant_member/entities/tenant_member.entity";

// Default path — ~99% of the app
const ds = await getDataSource();
const users = await ds.getRepository(User).find();

// Per-tenant DB override (optional; falls back to default when no row exists)
const tds = await tenantDataSourceFor(tenantId);
const members = await tds.getRepository(TenantMember).find();
```

---

## Rules

- No `next/*`, no `react` — service-layer infrastructure only.
- Always `await` the helpers — the first call runs a lazy `initialize()`.
- Tests mock these helpers; production code never calls `new DataSource()` directly.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

The db module is a pure-infrastructure TypeORM DataSource factory (one shared default DB plus an optional per-tenant physical-DB override via the TenantDatabase mapping) and exposes no settings, no service layer, and no SettingService reads, so its only tenant surface is connection routing.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| tenantDataSourceFor never sets the RLS session variable, so per-tenant Row-Level Security is not actually enforced at the connection layer | `db.ts:tenantDataSourceFor` | Migration 001_tenant_rls.sql enables RLS on ~22 tenant-scoped tables and documents that the app MUST issue `SET LOCAL app.current_tenant = $1` at each connection checkout (TypeORM query hook / DataSource subscriber). db.ts wires no such hook, so the documented defense-in-depth tenant isolation is dormant and every query relies solely on the application-layer `where: { tenantId }` guards. This is a per-tenant security boundary that should be set from the request tenantId. | — |
| synchronize, logging level, and MAX_CACHED connection-pool sizing are global/env-derived, not per-tenant | `db.ts (defaultDataSource + tenantDataSourceFor DataSource options, MAX_CACHED constant)` | Intentionally global shared-infrastructure tuning (driven by NODE_ENV / env and a single LRU cap of 100). A large or noisy tenant cannot get a different pool size, logging verbosity, or sync behavior, but making these per-tenant is generally undesirable for shared infra, so this is noted only for contrast and not recommended as a real setting. | — |

---

## Dependencies

Requires the [`env`](../env) module (`DATABASE_URL`). Imports entity classes from every domain module to assemble the shared `ENTITIES` array.
