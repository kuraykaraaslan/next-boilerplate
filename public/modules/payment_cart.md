# Payment Cart

- **id:** `payment_cart`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_cart/`
- **tags:** payment, cart, ecommerce
- **icon:** `fas fa-cart-shopping`
- **hasNextLayer:** false

Tenant-aware shopping cart for users and anonymous guests. Manages cart items, quantities, coupon codes, totals, guest-to-user merge, and conversion to checkout.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `coupon`

## Services

- `payment_cart.calc.service.ts`
- `payment_cart.crud.service.ts`
- `payment_cart.expiry.service.ts`
- `payment_cart.inventory.service.ts`
- `payment_cart.item.service.ts`
- `payment_cart.service.ts`

## DTOs

- `payment_cart.dto.ts`

## Entities

- `cart.entity.ts`
- `cart_item.entity.ts`

## Enums

- `payment_cart.enums.ts`

## Message keys

- `payment_cart.messages.ts`

## TypeORM entities

- `Cart` (system) — `modules/payment_cart/entities/cart.entity.ts`
- `CartItem` (system) — `modules/payment_cart/entities/cart_item.entity.ts`

## README

# Payment Cart Module

Tenant-aware shopping cart for both authenticated users and anonymous guests. Holds line items, quantities, an optional coupon code, and derived totals until the cart is converted to a checkout.

---

## Purpose

A cart is a short-lived, mutable basket scoped to a tenant. It can be owned by a `userId` (logged-in shopper) or a `guestToken` (anonymous session). When a guest signs in, their cart can be merged into the user's active cart. On checkout the cart is marked `CONVERTED` so it stops being reused.

Money lives on the **items** (`unitPrice` × `quantity`); the cart's `subtotal` / `discountTotal` are recomputed and persisted after every mutation, and the live `total` / `itemCount` are computed on read.

```
Cart (carts)                 ← owner = userId OR guestToken, status, currency, coupon, subtotal/discountTotal
   ▲
   │ cartId FK
   │
CartItem (cart_items)        ← productId/variantId/sku, name, unitPrice, quantity
```

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `Cart` | `carts` | Basket owned by a `userId` or `guestToken`; `status` (ACTIVE / CONVERTED / ABANDONED / MERGED), `currency` (3-letter, default `USD`), `couponCode?`, persisted `subtotal?` / `discountTotal?`, `metadata?`, `expiresAt?`, timestamps + soft delete (`deletedAt`). |
| `CartItem` | `cart_items` | Line item belonging to a cart: `productId?` / `variantId?` / `sku?`, `name`, `unitPrice` (decimal 12,2), `quantity` (int, default 1), `metadata?`, timestamps. |

Both live in the **tenant DB** (resolved via `tenantDataSourceFor(tenantId)`) and carry a `tenantId` column; there are no cross-table FKs, so `cartId` links the two logically.

---

## Service / Responsibilities

All methods are static on `PaymentCartService` and take `tenantId` as the first argument. After every mutation the cart is recomputed and persisted via the private `recalcAndSave`, and the `pay:cart:<cartId>` cache entry is busted.

| Method | Returns | Description |
|---|---|---|
| `getOrCreateCart(tenantId, dto)` | `CartWithItems` | Find the ACTIVE cart for a `userId` or `guestToken`, else create one (`currency` from the DTO, default `USD`). Throws `INVALID_IDENTIFIER` if neither is given. |
| `getById(tenantId, cartId)` | `CartWithItems` | Load a cart with items and computed totals (single-flight cached). |
| `addItem(tenantId, cartId, dto)` | `CartWithItems` | Add a line to an ACTIVE cart; same `productId`+`variantId` increments quantity. |
| `updateItemQuantity(tenantId, cartId, cartItemId, quantity)` | `CartWithItems` | Set quantity; `<= 0` removes the item. |
| `removeItem(tenantId, cartId, cartItemId)` | `CartWithItems` | Remove a single line item. |
| `clear(tenantId, cartId)` | `CartWithItems` | Delete all items in the cart. |
| `applyCoupon(tenantId, cartId, dto)` | `CartWithItems` | Validate and store a coupon code; rejects an invalid code with `COUPON_INVALID`. |
| `removeCoupon(tenantId, cartId)` | `CartWithItems` | Clear the applied coupon and recompute totals. |
| `mergeGuestIntoUser(tenantId, guestToken, userId)` | `CartWithItems` | Move guest items into the user's ACTIVE cart and mark the guest cart `MERGED`. |
| `markConverted(tenantId, cartId)` | `void` | Flag the cart `CONVERTED` after a successful checkout. |
| `list(tenantId, query)` | `{ data: SafeCart[]; total }` | Paginated cart listing, filterable by `userId` / `status`. |

Private helpers: `computeTotals` (sums `unitPrice × quantity`, clamps the discount to the subtotal, derives `total` and `itemCount`), `resolveCouponDiscount` (delegates to the coupon module — see below), and `recalcAndSave` (re-resolves the coupon, persists `subtotal`/`discountTotal`, busts the cache).

---

## Coupons

`applyCoupon` is integrated with the **`coupon`** module. It validates the code against the cart's current subtotal, currency and product ids (`CouponService.validate`) and rejects an invalid code with `COUPON_INVALID`. The resolved discount is persisted to `discountTotal`, so `total === subtotal − discountTotal`.

The discount is **re-resolved on every cart mutation** (`recalcAndSave`): when items change the discount recomputes, and if the coupon is no longer valid (expired, minimum-amount no longer met, …) it is automatically dropped from the cart (`couponCode` set to `null`). Use `removeCoupon(tenantId, cartId)` to clear it manually. A failure inside `CouponService.validate` is caught and logged, and the coupon is treated as invalid (no throw).

---

## Cache keys

- `pay:cart:<cartId>` — single-flight cache for `getById`. Busted on every mutation (`addItem`, `updateItemQuantity`, `removeItem`, `clear`, `applyCoupon`, `removeCoupon`, `mergeGuestIntoUser`, `markConverted`).

`CACHE_TTL` falls back to `env.TENANT_CACHE_TTL ?? 300`.

---

## Settings

This module declares **no settings** — no per-tenant and no system-only setting keys. There is no `*.setting.keys.ts` / `*.settings.fields.ts` file and no admin-settings page; behavior is driven entirely by call-time DTO arguments and the data in the tenant DB.

---

## Usage

```ts
import { PaymentCartService } from '@/modules/payment_cart'

// Guest adds an item
const cart = await PaymentCartService.getOrCreateCart(tenantId, { guestToken: 'g-abc', currency: 'USD' })
await PaymentCartService.addItem(tenantId, cart.cartId, {
  productId, name: 'Pro License', unitPrice: 49.0, quantity: 1,
})

// Guest signs in → merge into their user cart
const userCart = await PaymentCartService.mergeGuestIntoUser(tenantId, 'g-abc', userId)

// On successful checkout
await PaymentCartService.markConverted(tenantId, userCart.cartId)
```

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages per-tenant shopping carts and line items (with coupon-discount resolution) stored in each tenant's own database via tenantDataSourceFor; it is fully tenant-scoped by data but declares zero per-tenant or system settings.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Cart` | `carts` | userId, guestToken, status, currency, couponCode, subtotal, discountTotal, metadata, expiresAt |
| `CartItem` | `cart_items` | cartId, productId, variantId, sku, name, unitPrice, quantity, metadata |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_cart.service.ts:resolveCouponDiscount` — Coupon discount applied to a cart is resolved through CouponService.validate({ code, tenantId, currency, amount, productIds }); because the coupon catalog is tenant-scoped (tenantDataSourceFor / keyed by tenantId), the same coupon code yields a valid discount, an invalid/dropped coupon, or a different discount amount depending on the requesting tenant's coupons. Used by recalcAndSave and applyCoupon.
- `payment_cart.service.ts` — All cart/item reads and writes (getOrCreateCart, getById, addItem, updateItemQuantity, removeItem, clear, applyCoupon, removeCoupon, mergeGuestIntoUser, markConverted, list) go through tenantDataSourceFor(tenantId) and filter by tenantId, so every tenant sees only its own carts and items.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Default cart currency is hardcoded to 'USD' in the GetOrCreateCartDTO default and the Cart entity column default; there is no per-tenant default currency, so a tenant operating in EUR/GBP must pass currency on every getOrCreateCart call or carts silently default to USD. | `payment_cart.dto.ts:GetOrCreateCartDTO (currency default 'USD') and cart.entity.ts:Cart.currency (column default 'USD')` | Storefront currency is a classic per-tenant configuration; relying on a global USD default means a non-USD tenant gets wrong-currency carts whenever the caller omits currency, and coupon validation (which passes currency) would also mismatch. | `defaultCartCurrency` |
| Cart expiry / abandonment window is not driven by any policy: the service never sets expiresAt, and the only expiry/abandonment values are ad-hoc literals in the seed (7-day active window, manual ABANDONED status). There is no per-tenant cart-TTL or abandonment threshold controlling when carts expire or are marked ABANDONED. | `payment_cart.service.ts (no expiresAt assignment in getOrCreateCart/addItem) and payment_cart.seed.ts (hardcoded 7-day / daysAgo windows)` | How long a cart stays active before expiring/abandoning is a merchandising policy that legitimately differs per tenant (e.g., flash-sale stores want short TTLs); today it is effectively unconfigured/global and only exercised by seed literals. | `cartExpiryDays` |
| CACHE_TTL is a single global value (env.TENANT_CACHE_TTL ?? 300) applied to every tenant's cart cache entries. | `payment_cart.service.ts:CACHE_TTL (module-level const)` | This is intentionally global shared cache/infra tuning rather than tenant-facing config; listed only for completeness. Making cache TTL per-tenant would add little value and complicate cache invalidation, so it should likely stay global. | — |

---

## Dependencies

`db`, `env`, `redis`, `logger`, `coupon`. No dependency on `payment_core`; currency is a plain 3-letter string (default `USD`).
