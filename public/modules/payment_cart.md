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

# payment_cart

Tenant-aware shopping cart for both authenticated users and anonymous guests. Holds line items, quantities, an optional coupon code, and derived totals until the cart is converted to a checkout.

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

## Entities

- `Cart` — `cartId`, `tenantId`, `userId?`, `guestToken?`, `status` (ACTIVE | CONVERTED | ABANDONED | MERGED), `currency` (3-letter, default `USD`), `couponCode?`, `subtotal?`, `discountTotal?`, `metadata?`, `expiresAt?`, timestamps + soft delete.
- `CartItem` — `cartItemId`, `tenantId`, `cartId`, `productId?`, `variantId?`, `sku?`, `name`, `unitPrice` (decimal 12,2), `quantity` (int, default 1), `metadata?`, timestamps.

## Public service methods

All methods are static on `PaymentCartService` and take `tenantId` as the first argument.

| Method | Returns | Description |
| --- | --- | --- |
| `getOrCreateCart(tenantId, dto)` | `CartWithItems` | Find the ACTIVE cart for a `userId` or `guestToken`, else create one. |
| `getById(tenantId, cartId)` | `CartWithItems` | Load a cart with items and computed totals (single-flight cached). |
| `addItem(tenantId, cartId, dto)` | `CartWithItems` | Add a line; same `productId`+`variantId` increments quantity. |
| `updateItemQuantity(tenantId, cartId, cartItemId, quantity)` | `CartWithItems` | Set quantity; `<= 0` removes the item. |
| `removeItem(tenantId, cartId, cartItemId)` | `CartWithItems` | Remove a single line item. |
| `clear(tenantId, cartId)` | `CartWithItems` | Delete all items in the cart. |
| `applyCoupon(tenantId, cartId, dto)` | `CartWithItems` | Store a coupon code (validation is a TODO — see below). |
| `mergeGuestIntoUser(tenantId, guestToken, userId)` | `CartWithItems` | Move guest items into the user's ACTIVE cart and mark the guest cart `MERGED`. |
| `markConverted(tenantId, cartId)` | `void` | Flag the cart `CONVERTED` after a successful checkout. |
| `list(tenantId, query)` | `{ data: SafeCart[]; total }` | Paginated cart listing, filterable by `userId` / `status`. |

## Coupons

`applyCoupon` is integrated with the **`coupon`** module. It validates the code against the cart's current subtotal, currency and product ids (`CouponService.validate`) and rejects an invalid code with `COUPON_INVALID`. The resolved discount is persisted to `discountTotal`, so `total === subtotal − discountTotal`.

The discount is **re-resolved on every cart mutation** (`recalcAndSave`): when items change the discount recomputes, and if the coupon is no longer valid (expired, minimum-amount no longer met, …) it is automatically dropped from the cart. Use `removeCoupon(tenantId, cartId)` to clear it manually.

## Dependencies

`db`, `env`, `redis`, `logger`. No dependency on `payment_core`; currency is a plain 3-letter string (default `USD`).

## Cache keys

- `pay:cart:<cartId>` — single-flight cache for `getById`. Busted on every mutation (`addItem`, `updateItemQuantity`, `removeItem`, `clear`, `applyCoupon`, `mergeGuestIntoUser`, `markConverted`).

`CACHE_TTL` falls back to `env.TENANT_CACHE_TTL ?? 300`.

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
