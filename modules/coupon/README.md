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
| GET | `/system/api/coupons` | system:admin | List all coupons |
| POST | `/system/api/coupons` | system:admin | Create coupon |
| GET | `/system/api/coupons/[couponId]` | system:admin | Get coupon |
| PUT | `/system/api/coupons/[couponId]` | system:admin | Update coupon |
| DELETE | `/system/api/coupons/[couponId]` | system:admin | Archive coupon |
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
- `minimumAmount` checked against order amount
- `applicablePlanIds` — null means all plans
- `applicableProviders` — null means all providers

## Stripe Sync

Call `StripeCouponProvider.syncCoupon(coupon)` after creating a coupon to push it to the Stripe dashboard. The Stripe Coupon ID is `coupon_{couponId without dashes}`.
