# Coupon

- **id:** `coupon`
- **tier:** billing
- **version:** 1.0.0
- **dir:** `modules/coupon/`
- **tags:** billing, marketing
- **icon:** `fas fa-ticket`
- **hasNextLayer:** true

Discount coupons + redemption tracking. Provider-aware (Stripe / PayPal / Iyzico) so codes sync with the payment processor.

## Dependencies

- **requires:** `db`, `env`, `payment`, `common`

## Services

- `coupon.analytics.service.ts`
- `coupon.bulk.service.ts`
- `coupon.crud.core.service.ts`
- `coupon.crud.service.ts`
- `coupon.redemption.service.ts`
- `coupon.service.ts`
- `coupon.validation.service.ts`

## DTOs

- `coupon.dto.ts`

## Entities

- `coupon.entity.ts`
- `coupon_redemption.entity.ts`

## Enums

- `coupon.enums.ts`

## Message keys

- `coupon.messages.ts`

## Owned API routes

- `tenant` GET/POST `/tenant/[tenantId]/api/coupons`
- `tenant` GET/PUT/DELETE `/tenant/[tenantId]/api/coupons/[couponId]`
- `tenant` POST `/tenant/[tenantId]/api/coupons/apply`
- `tenant` GET `/tenant/[tenantId]/api/coupons/redemptions`
- `tenant` POST `/tenant/[tenantId]/api/coupons/validate`

## TypeORM entities

- `Coupon` (system) — `modules/coupon/server/entities/coupon.entity.ts`
- `CouponRedemption` (system) — `modules/coupon/server/entities/coupon_redemption.entity.ts`

## Next layer (modules_next/) surface

- `coupon/ui/coupon-apply-form.component` _(ui, client)_
- `coupon/ui/coupon-archive-modal.component` _(ui, client)_
- `coupon/ui/coupon-badge.component` _(ui)_
- `coupon/ui/coupon-create-modal.component` _(ui, client)_
- `coupon/ui/coupon-edit.utils` _(ui)_
- `coupon/ui/coupon-list-columns.component` _(ui, client)_
- `coupon/ui/coupon-redemptions-list.component` _(ui, client)_
- `coupon/ui/coupon-scope-panel.component` _(ui, client)_
- `coupon/ui/coupons-coupon-id.page` _(ui, client)_
- `coupon/ui/coupons.page` _(ui, client)_

## README

# Coupon Module

Per-tenant discount-coupon system for subscription plans, store products, and payments: CRUD, server-side validation, redemption tracking, and optional sync to a payment provider's native coupon API (Stripe). Discount calculation is always server-side — providers receive the already-discounted amount.

---

## Entities

Both entities live in the **tenant DB** (resolved per request via `tenantDataSourceFor(tenantId)`) and every row is isolated by `tenantId`.

| Entity | Table | Description |
|---|---|---|
| `Coupon` | `coupons` | Coupon definition — code, name, discount type/value, currency, JSONB `scope`, usage limits, status, validity window. `Unique(tenantId, code)`. |
| `CouponRedemption` | `coupon_redemptions` | Per-redemption record — `couponId`/`couponCode`, optional `paymentId`/`userId` (soft references), discount/original/final amounts, currency, `appliedAt`. |

---

## Discount Types

| Type | Behavior |
|---|---|
| `PERCENTAGE` | Reduces amount by N% (`discountValue` ≤ 100, enforced at the DTO layer). |
| `FIXED_AMOUNT` | Reduces amount by exact `discountValue`, capped at the amount. Requires `currency`; the discount applies only when `coupon.currency` matches the request currency (otherwise `0`). |

`CouponStatus`: `ACTIVE`, `INACTIVE`, `EXPIRED`, `ARCHIVED`.

---

## Service (`CouponService`)

All methods are static and take `tenantId` first so they resolve the correct tenant DataSource.

| Method | Responsibility |
|---|---|
| `create(tenantId, dto)` | Insert a coupon (rejects duplicate `code` for the tenant), clears any negative cache for the code, dispatches `coupon.created`. |
| `getAll(tenantId, query)` | Paginated list with optional `status` filter and `code` `ILike` search, newest first. |
| `getById(tenantId, couponId)` | Single coupon, Redis-cached + single-flight. |
| `getByCode(tenantId, code)` | Lookup by uppercased code (drives `validate`/`apply`), cached with negative-cache for unknown codes. |
| `update(tenantId, couponId, dto)` | Partial update, invalidates old (and renamed) cache keys, dispatches `coupon.updated`. |
| `archive(tenantId, couponId)` | Soft-delete by setting `status = 'ARCHIVED'`, invalidates cache. |
| `validate(dto)` | Computes validity + discount entirely from the tenant's coupon row (status, validity window, `maxUses`, `maxUsesPerTenant`, scope). Returns `{ valid, coupon?, discountAmount?, finalAmount?, message? }`. Never throws on a bad code. |
| `apply(dto)` | Re-validates, creates a `CouponRedemption`, increments `usedCount`, invalidates cache, dispatches `coupon.redeemed`. |
| `getRedemptionsByTenant(tenantId, page, pageSize)` | Paginated redemption history for the tenant, newest first. |
| `scopeApplies(scope, ctx)` *(static helper)* | Evaluates a coupon's JSONB scope against a usage context (see *Scope*). |
| `calculateDiscount(coupon, amount, currency?)` *(static helper)* | Pure discount math for both discount types. |

---

## API Routes

All routes are tenant-scoped under `/tenant/[tenantId]/api/coupons`. Auth is enforced via `TenantSessionNextService.authenticateTenantByRequest`; all routes are rate-limited (`Limiter`).

| Method | Path | Min role | Description |
|---|---|---|---|
| GET | `/coupons` | `ADMIN` | List this tenant's coupons (`page`, `pageSize`, `status`, `search`). |
| POST | `/coupons` | `ADMIN` | Create coupon (`409` on duplicate code). |
| GET | `/coupons/[couponId]` | `ADMIN` | Get coupon (`404` if not found). |
| PUT | `/coupons/[couponId]` | `ADMIN` | Update coupon. |
| DELETE | `/coupons/[couponId]` | `ADMIN` | Archive coupon. |
| POST | `/coupons/validate` | `USER` | Validate code + preview discount (`tenantId` injected from the path). |
| POST | `/coupons/apply` | `USER` | Apply code, record redemption (`userId` injected from the session). |
| GET | `/coupons/redemptions` | `ADMIN` | Redemption history (`page`, `pageSize`). |

Tenant admin pages: `/tenant/[tenantId]/admin/coupons` and `/tenant/[tenantId]/admin/coupons/[couponId]`.

---

## Validation Rules

`validate` short-circuits with a typed message (`coupon.messages.ts`) in this order:

- Code resolves to a coupon (else `INVALID_CODE`).
- Coupon is `ACTIVE` (else `COUPON_INACTIVE`).
- `startsAt` / `expiresAt` window is current (`COUPON_NOT_STARTED` / `COUPON_EXPIRED`).
- `maxUses` (global cap) not yet reached against `usedCount` (`MAX_USES_REACHED`).
- `scopeApplies` passes for the supplied context.
- `maxUsesPerTenant` not yet reached, counted via `getTenantRedemptionCount` (`MAX_USES_PER_TENANT_REACHED`).

---

## Scope

`Coupon.scope` is a single JSONB column capturing every targeting dimension. Each field is **optional**; a missing/null dimension acts as a wildcard. Pass the relevant fields at validate/apply time.

```ts
type CouponScope = {
  productIds?: string[]   // limit to specific store products (one-time sales)
  planIds?: string[]      // limit to specific subscription plans
  categoryIds?: string[]  // limit to products in these categories
  providers?: string[]    // limit to specific payment providers
  appliesTo?: 'line' | 'cart'  // 'line' = discount each matching line, 'cart' = discount cart total. Default 'line'.
  minimumAmount?: number  // minimum subtotal (in coupon.currency)
}
```

Matching semantics (`CouponService.scopeApplies`):
- `planIds` — `ctx.planId` must be in the list.
- `productIds` — `ctx.productIds` (cart's product UUIDs) must intersect the list.
- `categoryIds` — `ctx.categoryIds` must intersect the list.
- `providers` — `ctx.provider` must be in the list.
- `minimumAmount` — `ctx.amount` must be ≥ this threshold.

A dimension is only checked when both the scope field and the matching context value are present, so an unscoped coupon (or a context that omits a value) passes that dimension. `appliesTo` is metadata for checkout-flow callers — it doesn't gate validation by itself.

---

## Provider Sync

Discount calculation is always server-side; provider sync is optional and only pushes the coupon into the processor's own coupon/discount system.

| Provider | Native coupon API | Sync support |
|---|---|---|
| Stripe (`StripeCouponProvider`) | Yes — Coupon + Promotion Code | `syncCoupon()` creates the Stripe Coupon and a matching Promotion Code; `getCheckoutCouponParam()` returns the checkout-session discount param. |
| PayPal (`PaypalCouponProvider`) | No | No-op sync — discount applied by reducing the order amount server-side. |
| Iyzico (`IyzicoCouponProvider`) | No | No-op sync — discount applied by reducing the basket total server-side. |

All three extend `BaseCouponProvider` (`providers/base.coupon.provider.ts`). The active provider is chosen by the caller, not by a tenant setting.

### Stripe Sync

Call `StripeCouponProvider.syncCoupon(coupon)` after creating a coupon to push it to Stripe. The Stripe Coupon ID is `coupon_{couponId without dashes}` (used as the idempotency key, so the call is safe to repeat). The credential is read from the **root** tenant (`stripeSecretKey` at `ROOT_TENANT_ID`) — a tenant cannot sync to its own Stripe account today. When serializing a `FIXED_AMOUNT` coupon, currency falls back to `'USD'` if `coupon.currency` is unset.

---

## Caching

Coupons are cached in Redis (TTL = `COUPON_CACHE_TTL`, from `env.TENANT_CACHE_TTL`, default 5 min). Keys are namespaced by tenant:

| Key | Used by |
|---|---|
| `coupon:id:{tenantId}:{couponId}` | `getById` |
| `coupon:code:{tenantId}:{CODE}` (uppercase) | `getByCode` → drives `validate` / `apply` lookups |

Invalidation runs on **update**, **archive**, and **apply** (which increments `usedCount`) and clears both keys for the tenant. Apply is critical: stale `usedCount` could allow `maxUses` overspend, so the cache is invalidated even though the row is only incremented. `create` clears any negative cache for the new code.

### Stampede + negative cache

- **TTL jitter** (`jitter`) on every cache write.
- **In-process single-flight** (`singleFlight`) dedupes concurrent loaders for the same code/id.
- **Negative cache** on `getByCode`: unknown codes are cached as `__not_found__` for up to `NEGATIVE_CACHE_TTL` (≤ 60s) — blunts guessing/brute-forcing of coupon codes.

---

## Webhooks

`apply`/`create`/`update` dispatch tenant-scoped events via `WebhookService.dispatchEvent(tenantId, …)`:

- `coupon.created` — on `create`.
- `coupon.updated` — on `update`.
- `coupon.redeemed` — on `apply` (includes `redemptionId`, `userId`, `discountAmount`, `finalAmount`).

---

## Migration notes

- **Replaced flat columns with `scope` jsonb.** Removed `applicablePlanIds`, `applicableProviders`, `minimumAmount` from the entity. Added `scope`. Manual SQL if you have legacy data:
  ```sql
  ALTER TABLE coupons ADD COLUMN scope jsonb;
  UPDATE coupons SET scope = jsonb_strip_nulls(jsonb_build_object(
    'planIds',       "applicablePlanIds",
    'providers',     "applicableProviders",
    'minimumAmount', "minimumAmount"
  )) WHERE "applicablePlanIds" IS NOT NULL
       OR "applicableProviders" IS NOT NULL
       OR "minimumAmount" IS NOT NULL;
  ALTER TABLE coupons DROP COLUMN IF EXISTS "applicablePlanIds",
                     DROP COLUMN IF EXISTS "applicableProviders",
                     DROP COLUMN IF EXISTS "minimumAmount";
  ```
  TypeORM `synchronize` handles dev databases automatically.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A per-tenant discount-coupon module (CRUD, validation, redemption tracking, optional sync to payment-provider coupon APIs) where every coupon and redemption is scoped to the request tenantId via tenantDataSourceFor; it declares no tenant-configurable setting keys of its own and only reads a platform-level Stripe secret for provider sync.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Coupon` | `coupons` | code, name, description, discountType, discountValue, currency, scope, maxUses, maxUsesPerTenant, usedCount, status, startsAt, expiresAt |
| `CouponRedemption` | `coupon_redemptions` | couponId, couponCode, paymentId, userId, discountAmount, currency, originalAmount, finalAmount |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `coupon.service.ts:create/getAll/getById/getByCode/update/archive/apply` — Every method resolves ds = tenantDataSourceFor(tenantId) and filters all reads/writes by { tenantId }, so each tenant has its own isolated catalog of coupons keyed by code (Unique(tenantId, code)); cache keys are namespaced by tenantId (coupon:id:{tenantId}:..., coupon:code:{tenantId}:...).
- `coupon.service.ts:validate` — Validity, discount amount, and final amount are computed entirely from the tenant's own coupon row — its status, startsAt/expiresAt window, maxUses, maxUsesPerTenant, currency, discountType/discountValue, and JSON scope (planIds/productIds/categoryIds/providers/minimumAmount via scopeApplies) — so the same code string yields different outcomes per tenant.
- `coupon.service.ts:apply` — Creates a per-tenant redemption row and increments that tenant's coupon usedCount; per-tenant redemption count gate enforced via getTenantRedemptionCount(tenantId, couponId) against maxUsesPerTenant; dispatches coupon.* webhooks scoped to the tenant via WebhookService.dispatchEvent(tenantId, ...).

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Coupon read/write TTL and negative-cache TTL are global, derived from env.TENANT_CACHE_TTL (COUPON_CACHE_TTL / NEGATIVE_CACHE_TTL), not per-tenant. | `coupon.service.ts:COUPON_CACHE_TTL/NEGATIVE_CACHE_TTL` | A shared infra/cache concern, intentionally global; tenant-level override would add complexity for little benefit, so listing only for completeness. | — |
| The active coupon-sync provider (Stripe vs Iyzico/PayPal no-op) is chosen by the caller, not by a tenant-configured payment-provider setting; the Stripe path also uses ROOT-level credentials so a tenant cannot sync coupons to its own Stripe account. | `providers/stripe.coupon.provider.ts:getClient + base.coupon.provider.ts` | Tenants on different payment providers (or with their own Stripe connect account) plausibly need provider selection and credentials per tenant rather than a single platform Stripe key; today this is platform-global. | `couponSyncProvider` |
| Default fallback currency 'USD' is hardcoded when serializing a fixed-amount coupon to Stripe. | `providers/stripe.coupon.provider.ts:syncCoupon` | A tenant operating in a non-USD market would want its base currency as the fallback rather than a global USD constant. | `defaultCurrency` |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `stripeSecretKey` — Platform Stripe secret key read at ROOT_TENANT_ID by StripeCouponProvider.getClient() to create Stripe Coupons/Promotion Codes when syncing a tenant coupon to Stripe; not tenant-overridable.

---

## Dependencies

Requires: `db`, `env`, `payment`, `common`. Also uses `redis` (caching/single-flight), `setting` (root Stripe key), `webhook` (event dispatch), and `logger`.
