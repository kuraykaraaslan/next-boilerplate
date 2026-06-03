# Payment Wishlist

- **id:** `payment_wishlist`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_wishlist/`
- **tags:** wishlist, ecommerce, favorites
- **icon:** `fas fa-heart`
- **hasNextLayer:** false

Tenant-aware wishlists / favorites. Users keep multiple named lists of products and variants, with optional public sharing via a share token.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`

## Services

- `payment_wishlist.service.ts`

## DTOs

- `payment_wishlist.dto.ts`

## Entities

- `wishlist.entity.ts`
- `wishlist_item.entity.ts`

## Enums

- `payment_wishlist.enums.ts`

## Message keys

- `payment_wishlist.messages.ts`

## TypeORM entities

- `Wishlist` (system) — `modules/payment_wishlist/entities/wishlist.entity.ts`
- `WishlistItem` (system) — `modules/payment_wishlist/entities/wishlist_item.entity.ts`

## README

# Payment Wishlist Module

Tenant-aware wishlists / favorites. Framework-agnostic — no UI, just a service + entities. Users keep one or more named lists of products (and optional variants), with optional public sharing via a `shareToken`.

---

## Domain model

- **Wishlist** — a named list owned by a user, tenant-scoped. Every user gets a `Default` list on demand. `isPublic` + `shareToken` enable read-only public sharing.
- **WishlistItem** — a product (optionally a specific `variantId`) inside a list, with an optional `note`. An item is unique per `productId` + `variantId` within a list (de-duplicated on add).

---

## Entities

Both live in the **tenant DB**.

| Entity | Table | Description |
|---|---|---|
| `Wishlist` | `wishlists` | `wishlistId` (uuid pk), `tenantId`, `userId`, `name` (default `Default`), `isPublic`, `shareToken` (nullable), `metadata` (jsonb), timestamps + soft delete (`deletedAt`) |
| `WishlistItem` | `wishlist_items` | `wishlistItemId` (uuid pk), `tenantId`, `wishlistId`, `productId`, `variantId` (nullable), `note` (nullable text), `createdAt` |

`tenantId` is indexed on both entities; all access goes through `tenantDataSourceFor(tenantId)`.

---

## Service — `PaymentWishlistService` (static methods)

| Method | Returns | Notes |
|---|---|---|
| `getOrCreateDefault(tenantId, userId)` | `WishlistWithItems` | Finds the user's `Default` list or creates it. |
| `create(tenantId, dto)` | `SafeWishlist` | Generates a `shareToken` when `isPublic` is true. |
| `getById(tenantId, wishlistId)` | `WishlistWithItems` | `singleFlight`-cached; includes items + `itemCount`. |
| `getByShareToken(tenantId, shareToken)` | `WishlistWithItems` | Throws unless the list exists and `isPublic`. |
| `update(tenantId, wishlistId, dto)` | `SafeWishlist` | Generates a `shareToken` if `isPublic` is turned on and none exists. |
| `list(tenantId, query)` | `{ data: SafeWishlist[]; total }` | Paginated, optional `userId` filter. |
| `addItem(tenantId, wishlistId, dto)` | `WishlistWithItems` | De-duped by `productId` + `variantId` (no-op if present). |
| `removeItem(tenantId, wishlistId, wishlistItemId)` | `WishlistWithItems` | Hard delete of the item. |
| `moveItem(tenantId, fromWishlistId, toWishlistId, wishlistItemId)` | `WishlistWithItems` | Re-points the item; returns the destination list. |
| `clear(tenantId, wishlistId)` | `WishlistWithItems` | Removes all items. |
| `delete(tenantId, wishlistId)` | `void` | Soft delete (`softRemove`). |

`SafeWishlist` omits `deletedAt`. `WishlistWithItems` extends it with `items` (ordered `createdAt DESC`) and `itemCount`. DTOs are Zod-validated (`CreateWishlistDTO`, `UpdateWishlistDTO`, `AddWishlistItemDTO`, `GetWishlistsQuery`); `GetWishlistsQuery` defaults to `page 0`, `pageSize 20` (max 100). A `WishlistVisibilityEnum` (`PRIVATE` | `PUBLIC`) is exported but not used by the service, which models visibility via the boolean `isPublic`.

---

## Cache keys

- `wishlist:<wishlistId>` — `getById` reads through `singleFlight`; every mutation (`update`, `addItem`, `removeItem`, `moveItem`, `clear`, `delete`) busts it via `redis.del`. `moveItem` busts both source and destination keys.

---

## Settings

No per-tenant or system settings. There are no `*.setting.keys.ts` / `*.settings.fields.ts` files; behavior is configured entirely through method arguments and DTOs.

---

## Seed

`payment_wishlist.seed.ts` provides idempotent demo data via `ctx.foc` (find-or-create on natural keys): three wishlists for one tenant (a private `Default`, a public `Holiday Picks` with a deterministic `shareToken`, and a second user's private `Office Gear`) and five items, then publishes `refs.wishlistId` and `refs.publicWishlistShareToken` for later modules.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Multi-tenant wishlist/favorites system with per-tenant entities (Wishlist, WishlistItem) and full tenant isolation via tenantDataSourceFor; no per-tenant settings or behavioral branching.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Wishlist` | `wishlists` | name, isPublic, shareToken, metadata, userId |
| `WishlistItem` | `wishlist_items` | productId, variantId, note |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_wishlist.service.ts` — All methods accept tenantId and query the per-tenant datasource; isolation enforced via tenantDataSourceFor(tenantId) for both entities.

---

## Dependencies

`db`, `env`, `redis`, `logger`.

---

## Usage

```ts
import { PaymentWishlistService } from '@/modules/payment_wishlist'

// Get (or lazily create) the user's default list
const list = await PaymentWishlistService.getOrCreateDefault(tenantId, userId)

// Add a product (deduped automatically)
await PaymentWishlistService.addItem(tenantId, list.wishlistId, {
  productId,
  variantId,        // optional
  note: 'For the holidays',
})

// Make it shareable and read it back by token
const updated = await PaymentWishlistService.update(tenantId, list.wishlistId, { isPublic: true })
const shared = await PaymentWishlistService.getByShareToken(tenantId, updated.shareToken!)
```
