# payment_shipping

Tenant-aware shipping methods and a rate-calculation engine. Admin-configured — no storefront UI.

Define the shipping methods a tenant offers (carriers like ARAS, UPS, DHL…) and attach **rate rules** to each. At checkout, `calculateShipping` evaluates every rule against the cart and returns the cheapest applicable quote per method.

## Domain model

- **ShippingMethod** (`shipping_methods`) — a way to ship: `name`, tenant-scoped `code`, optional `carrier`, `isActive`, `sortOrder`, `metadata`. Soft-deletable.
- **ShippingRate** (`shipping_rates`) — a pricing rule under a method. Scopes by `countryCode` (ISO-2, null = any), `region` (null = any), and the ranges `minWeight`/`maxWeight`, `minSubtotal`/`maxSubtotal` (null bound = unbounded). Carries `price` + `currency`, an optional `freeThreshold` (subtotal at/above which shipping is free), and an `estimatedDaysMin`/`estimatedDaysMax` delivery window.

A method can have many rates (e.g. one per country band or weight tier). Hard-deleted with their method (not soft-deletable on their own).

## Service methods

All methods are static on `PaymentShippingService` and take `tenantId` first.

| Method | Description |
| --- | --- |
| `createMethod(tenantId, dto)` | Create a method. Rejects a duplicate `code` for the tenant. |
| `updateMethod(tenantId, methodId, dto)` | Partial update. Guards `code` uniqueness. Busts cache. |
| `getMethod(tenantId, methodId)` | Method **with its rates** (`ShippingMethodWithRates`). `singleFlight` cached. |
| `listMethods(tenantId, query)` | Paginated list, filterable by `isActive` / `carrier`. |
| `deleteMethod(tenantId, methodId)` | Soft delete. Busts cache. |
| `createRate(tenantId, dto)` | Create a rate under an existing method. Validates ranges. |
| `updateRate(tenantId, rateId, dto)` | Partial update. Validates ranges. Busts method cache. |
| `deleteRate(tenantId, rateId)` | Hard delete. Busts method cache. |
| `calculateShipping(tenantId, dto)` | Core engine — returns `ShippingQuote[]`, cheapest per method, sorted by price. |

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

Returns `[]` when the tenant has no active methods or nothing matches.

## Cache keys

- `pay:ship:<shippingMethodId>` — `getMethod` result (method + rates), via `singleFlight`. Busted on method update/delete and on any rate create/update/delete under that method.

## Dependencies

`db`, `env`, `redis`, `logger`.

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
