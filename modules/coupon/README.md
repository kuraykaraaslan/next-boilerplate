# coupon

Coupon / promo code system for subscription plans and payments.

## Overview

Coupons are created in the **system DB** by admins. Redemptions are stored per-tenant in the **tenant DB**. Discount calculation is always server-side — providers (Stripe, PayPal, Iyzico) receive the already-discounted amount.

## Architecture

```
System DB (global)
  └── coupons           — coupon definitions (code, discount, limits, expiry)

Tenant DB (per-tenant)
  └── coupon_redemptions — usage history per tenant
```

## Discount Types

| Type | Behavior |
|---|---|
| `PERCENTAGE` | Reduces amount by N% |
| `FIXED_AMOUNT` | Reduces amount by exact value (currency-matched) |

## Provider Sync

| Provider | Native coupon API | Sync support |
|---|---|---|
| Stripe | Yes — Coupon + Promotion Code | `StripeCouponProvider.syncCoupon()` creates the coupon and promo code in Stripe |
| PayPal | No | Discount applied by reducing order amount |
| Iyzico | No | Discount applied by reducing basket total |

## Service API

```typescript
// Admin
CouponService.create(dto)
CouponService.getAll(query)
CouponService.getById(couponId)
CouponService.update(couponId, dto)
CouponService.archive(couponId)

// Checkout flow
CouponService.validate({ code, tenantId, amount, currency, planId, provider })
CouponService.apply({ code, tenantId, paymentId, userId, amount, currency })

// History
CouponService.getRedemptionsByTenant(tenantId, page, pageSize)
```

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/tenant/00000000-0000-4000-8000-000000000000/api/coupons` | root-tenant admin | List all coupons |
| POST | `/tenant/00000000-0000-4000-8000-000000000000/api/coupons` | root-tenant admin | Create coupon |
| GET | `/tenant/00000000-0000-4000-8000-000000000000/api/coupons/[couponId]` | root-tenant admin | Get coupon |
| PUT | `/tenant/00000000-0000-4000-8000-000000000000/api/coupons/[couponId]` | root-tenant admin | Update coupon |
| DELETE | `/tenant/00000000-0000-4000-8000-000000000000/api/coupons/[couponId]` | root-tenant admin | Archive coupon |
| POST | `/tenant/[tenantId]/api/coupons/validate` | tenant member | Validate + preview discount |
| POST | `/tenant/[tenantId]/api/coupons/apply` | tenant member | Apply + record redemption |
| GET | `/tenant/[tenantId]/api/coupons/redemptions` | ADMIN+ | Redemption history |

## UI Components

```tsx
// Checkout form — lets user enter and validate a promo code
<CouponApplyForm
  tenantId={tenantId}
  amount={total}
  currency="USD"
  planId={planId}
  provider="STRIPE"
  onApplied={({ discountAmount, finalAmount, code }) => { ... }}
  onRemoved={() => { ... }}
/>

// Small badge showing applied coupon
<CouponBadge code="SUMMER25" discountType="PERCENTAGE" discountValue={25} />

// Tenant admin redemption history
<CouponRedemptionsList tenantId={tenantId} />
```

## Validation Rules

- Coupon must be `ACTIVE`
- `startsAt` and `expiresAt` windows enforced
- `maxUses` (global) and `maxUsesPerTenant` checked atomically
- Scope dimensions checked via `CouponService.scopeApplies(scope, ctx)` (see below)

## Scope

`Coupon.scope` is a single JSONB column that captures every targeting dimension. Each field is **optional**; a missing/null dimension acts as a wildcard. Pass relevant fields at validate/apply time.

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

Matching semantics:
- `planIds` — `ctx.planId` must be in the list.
- `productIds` — `ctx.productIds` (cart's product UUIDs) must intersect the list.
- `categoryIds` — `ctx.categoryIds` must intersect the list.
- `providers` — `ctx.provider` must be in the list.
- `minimumAmount` — `ctx.amount` must be ≥ this threshold.

When `validate` / `apply` is called with the relevant context the helper short-circuits with a typed reason if any dimension fails. `appliesTo` is metadata for checkout-flow callers — it doesn't gate validation by itself.

## Migration notes

Recent changes:

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

## Stripe Sync

Call `StripeCouponProvider.syncCoupon(coupon)` after creating a coupon to push it to the Stripe dashboard. The Stripe Coupon ID is `coupon_{couponId without dashes}`.

## Caching

Coupons are cached in Redis (TTL = `TENANT_CACHE_TTL`, default 5 min):

| Key | Used by |
|---|---|
| `coupon:id:{couponId}` | `getById` |
| `coupon:code:{CODE}` (uppercase) | `getByCode` → drives `validate` / `apply` lookups |

Invalidation on **update**, **archive**, and **apply** (which increments `usedCount`) clears both keys. Apply is critical: stale `usedCount` could allow `maxUses` overspend, so the cache is invalidated even though the row is only incremented. `create` clears any negative cache for the new code.

### Stampede + negative cache

- **TTL jitter (±10%)** on every cache write.
- **In-process single-flight** dedupes concurrent loaders for the same code/id.
- **Negative cache** on `getByCode`: unknown codes are cached as `__not_found__` for up to 60s — protects against guessing/brute-forcing coupon codes.
