# Payment Shipping Module

Tenant-aware shipping methods and a rate-calculation engine. Admin-configures the shipping methods a tenant offers (carriers like ARAS, UPS, DHL…) and attaches **rate rules** to each; at checkout `calculateShipping` evaluates every rule against the cart and returns the cheapest applicable quote per method. Service-only — no storefront UI and no HTTP routes of its own.

---

## Entities

Both live in the **tenant DB** and are isolated by `tenantId`.

| Entity | Table | Description |
|---|---|---|
| `ShippingMethod` | `shipping_methods` | A way to ship: `name`, tenant-scoped `code`, optional `carrier`/`description`, `isActive`, `sortOrder`, `metadata` (jsonb). Soft-deletable (`deletedAt`). |
| `ShippingRate` | `shipping_rates` | A pricing rule under a method. Scopes by `countryCode` (ISO-2, null = any), `region` (null = any), and the ranges `minWeight`/`maxWeight`, `minSubtotal`/`maxSubtotal` (null bound = unbounded). Carries `price` + `currency`, an optional `freeThreshold` (subtotal at/above which shipping is free), an `estimatedDaysMin`/`estimatedDaysMax` window, `isActive`, and `sortOrder`. Hard-deleted (no soft delete). |

A method can have many rates (e.g. one per country band or weight tier). Rates are not soft-deletable on their own.

`carrier` is one of the `ShippingCarrierEnum` values: `ARAS`, `YURTICI`, `MNG`, `PTT`, `UPS`, `FEDEX`, `DHL`, `TNT`, `CUSTOM`.

---

## Service methods

All methods are static on `PaymentShippingService` and take `tenantId` first.

| Method | Description |
| --- | --- |
| `createMethod(tenantId, dto)` | Create a method. Rejects a duplicate `code` for the tenant. |
| `updateMethod(tenantId, methodId, dto)` | Partial update. Guards `code` uniqueness when it changes. Busts cache. |
| `getMethod(tenantId, methodId)` | Method **with its rates** (`ShippingMethodWithRates`), rates ordered by `sortOrder` then `createdAt`. `singleFlight` cached. |
| `listMethods(tenantId, query)` | Paginated list, filterable by `isActive` / `carrier`. Returns `{ data, total }`. |
| `deleteMethod(tenantId, methodId)` | Soft delete. Busts cache. |
| `createRate(tenantId, dto)` | Create a rate under an existing method (parent must exist for the tenant). Validates ranges. Busts method cache. |
| `updateRate(tenantId, rateId, dto)` | Partial update. Validates ranges. Busts method cache. |
| `deleteRate(tenantId, rateId)` | Hard delete. Busts method cache. |
| `calculateShipping(tenantId, dto)` | Core engine — returns `ShippingQuote[]`, cheapest per method, sorted by price. |

Range validation (`assertRanges`) rejects `minWeight > maxWeight` and `minSubtotal > maxSubtotal`.

---

## Matching algorithm (`calculateShipping`)

For a cart context `{ countryCode?, region?, weight?, subtotal, currency }`:

1. Load all **active** methods for the tenant, then all **active** rates.
2. A rate **matches** when ALL hold:
   - **country** — rate's `countryCode` is null (any), or equals the cart's. A rate scoped to a country is skipped when the cart has no country.
   - **region** — rate's `region` is null (any), or equals the cart's. Same skip rule as country.
   - **weight** — within `[minWeight, maxWeight]`; a null bound is unbounded. A weight-bounded rate requires a cart `weight` to compare.
   - **subtotal** — within `[minSubtotal, maxSubtotal]`; null bound is unbounded.
3. **Price** — if `freeThreshold` is set and `subtotal >= freeThreshold`, the quote is free (`price = 0`, `isFree = true`); otherwise the rate's `price`.
4. **Cheapest per method** — among a method's matching rates, only the lowest-priced quote is kept.
5. Result is sorted **ascending by price**.

Returns `[]` when the tenant has no active methods or nothing matches. Failures are logged and rethrown as `CALCULATION_FAILED`.

---

## Cache keys

- `pay:ship:<shippingMethodId>` — `getMethod` result (method + rates), via `singleFlight`. TTL from `env.TENANT_CACHE_TTL` (default 300s). Busted on method update/delete and on any rate create/update/delete under that method.

---

## Settings

This module has no settings (no per-tenant or system-only setting keys). Shipping behavior is configured entirely through `ShippingMethod` / `ShippingRate` rows.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages tenant-scoped shipping methods and rate-calculation engine for checkout; all data is per-tenant, no per-tenant settings or feature branching.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `ShippingMethod` | `shipping_methods` | name, code, carrier, description, isActive, sortOrder, metadata |
| `ShippingRate` | `shipping_rates` | name, countryCode, region, minWeight, maxWeight, minSubtotal, maxSubtotal, price, currency, freeThreshold, estimatedDaysMin, estimatedDaysMax, isActive, sortOrder |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_shipping.service.ts:createMethod` — Each tenant creates and manages its own shipping methods with tenant-scoped code uniqueness constraint.
- `payment_shipping.service.ts:listMethods` — Pagination and filtering (isActive, carrier) are applied only to the requesting tenant's methods.
- `payment_shipping.service.ts:calculateShipping` — Quote engine loads only the requesting tenant's active methods and rates, evaluates matching against the cart, and returns per-tenant results.

---

## Usage

```ts
import { PaymentShippingService } from '@/modules/payment_shipping'

// 1. Define a method
const standard = await PaymentShippingService.createMethod(tenantId, {
  name: 'Standard', code: 'standard', carrier: 'ARAS',
})

// 2. Attach rate rules
await PaymentShippingService.createRate(tenantId, {
  shippingMethodId: standard.shippingMethodId,
  name: 'TR up to 5kg',
  countryCode: 'TR',
  maxWeight: 5,
  price: 49.9,
  currency: 'TRY',
  freeThreshold: 500, // free over 500 TRY
  estimatedDaysMin: 1,
  estimatedDaysMax: 3,
})

// 3. Quote a cart at checkout
const quotes = await PaymentShippingService.calculateShipping(tenantId, {
  countryCode: 'TR',
  weight: 2.4,
  subtotal: 120,
  currency: 'TRY',
})
// -> [{ shippingMethodId, methodName, carrier, rateId, price, currency, estimatedDaysMin, estimatedDaysMax, isFree }, ...]
```

---

## Dependencies

`db`, `env`, `redis`, `logger`.
