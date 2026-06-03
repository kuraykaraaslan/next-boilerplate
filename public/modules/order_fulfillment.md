# Order Fulfillment

- **id:** `order_fulfillment`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/order_fulfillment/`
- **tags:** order, fulfillment, shipping, ecommerce
- **icon:** `fas fa-box`
- **hasNextLayer:** false

Tenant-aware fulfillment and shipment tracking for orders. Manages packing, carrier tracking, status lifecycle, and an append-only event log.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`

## Services

- `order_fulfillment.service.ts`

## DTOs

- `order_fulfillment.dto.ts`

## Entities

- `fulfillment.entity.ts`
- `fulfillment_event.entity.ts`
- `fulfillment_item.entity.ts`

## Enums

- `order_fulfillment.enums.ts`

## Message keys

- `order_fulfillment.messages.ts`

## TypeORM entities

- `Fulfillment` (system) — `modules/order_fulfillment/entities/fulfillment.entity.ts`
- `FulfillmentEvent` (system) — `modules/order_fulfillment/entities/fulfillment_event.entity.ts`
- `FulfillmentItem` (system) — `modules/order_fulfillment/entities/fulfillment_item.entity.ts`

## README

# Order Fulfillment Module

Tenant-aware fulfillment and shipment tracking for orders. Manages packing, carrier tracking, a status lifecycle, and an append-only event log. Framework-agnostic — no `next/*`, `react`, or browser APIs.

`orderId` is an external uuid reference — there is **no** `order` module yet, so it is stored as a plain indexed column (no TypeORM relation/FK). `shippingMethodId` is an optional uuid reference to a method in the `payment_shipping` module.

---

## Entities

All three entities live in the **tenant DB** (resolved via `tenantDataSourceFor`) and are scoped by an indexed `tenantId`.

| Entity | Table | Description |
|---|---|---|
| `Fulfillment` | `fulfillments` | One shipment of an order. Holds `status`, `carrier` + tracking info (`trackingNumber`, `trackingUrl`), an optional `shippingMethodId`, free-form `notes` / `metadata`, and lifecycle timestamps (`packedAt`, `shippedAt`, `deliveredAt`, `cancelledAt`). Soft-deletable (`deletedAt`). |
| `FulfillmentItem` | `fulfillment_items` | The line items packed into a fulfillment. Each carries optional `orderItemId` / `productId` / `variantId` / `sku` plus a required `name` and an `int` `quantity` (default `1`). |
| `FulfillmentEvent` | `fulfillment_events` | Append-only status-change log. Every create / tracking change / status update writes one row (`status`, optional `message`, optional `metadata`). |

---

## Enums

- `FulfillmentStatusEnum` — `PENDING`, `PROCESSING`, `PACKED`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`, `RETURNED`.
- `FulfillmentCarrierEnum` — `ARAS`, `YURTICI`, `MNG`, `PTT`, `UPS`, `FEDEX`, `DHL`, `TNT`, `CUSTOM`.

### Status lifecycle

```
PENDING → PROCESSING → PACKED → SHIPPED → IN_TRANSIT → DELIVERED
                                                  │
                                       (terminal) │
   CANCELLED ◄───────── any non-terminal ─────────┤
   RETURNED  ◄──────────────────────────────────── 
```

`DELIVERED`, `CANCELLED`, and `RETURNED` are **terminal** — `updateStatus` throws `INVALID_STATUS_TRANSITION` if you try to move out of them (to a different status). Transitions are otherwise validated loosely (any forward jump is allowed). Reaching `PACKED` / `SHIPPED` / `DELIVERED` / `CANCELLED` stamps the matching timestamp once.

---

## Service

`OrderFulfillmentService` — static methods, all take `tenantId` first. Every read/write resolves the tenant DataSource via `tenantDataSourceFor(tenantId)` and filters by `tenantId`.

| Method | Description |
|---|---|
| `create(tenantId, dto)` | Insert a fulfillment + its items + an initial `PENDING` event, then dispatch the `fulfillment.created` webhook. Returns `FulfillmentWithItems`. |
| `getById(tenantId, fulfillmentId)` | Fetch fulfillment with `items` and `events` (both ordered `createdAt ASC`). `singleFlight`-cached. Throws `FULFILLMENT_NOT_FOUND` if missing. |
| `list(tenantId, query)` | Paginated list filtered by `orderId` / `status` / `carrier` / `trackingNumber`, ordered `createdAt DESC`. Returns `{ data, total }`. |
| `update(tenantId, fulfillmentId, dto)` | Patch carrier / tracking / notes / metadata. |
| `addTracking(tenantId, fulfillmentId, dto)` | Set carrier + tracking number/url and log an event. |
| `updateStatus(tenantId, fulfillmentId, dto)` | Change status, stamp the matching timestamp, append an event. Enforces the terminal-state rule and dispatches a webhook for `SHIPPED` / `DELIVERED` / `CANCELLED`. |
| `markShipped(tenantId, fulfillmentId, tracking?)` | Convenience: optional `addTracking` then status `SHIPPED` (delegates to `updateStatus`). |
| `cancel(tenantId, fulfillmentId, reason?)` | Status `CANCELLED` (delegates to `updateStatus`); `reason` becomes the event message. |
| `listEvents(tenantId, fulfillmentId)` | Full event log, oldest first. |

`logEvent` is a private helper that writes one `FulfillmentEvent` row; failures are logged (`EVENT_LOG_FAILED`) but never thrown.

### Cache keys

- `order:fulfillment:<fulfillmentId>` — `getById` result (`FulfillmentWithItems`). Written via `singleFlight` with TTL `CACHE_TTL` (`env.TENANT_CACHE_TTL ?? 300` seconds). Busted on every mutation (`update`, `addTracking`, `updateStatus`, and the convenience methods that wrap them).

### Webhooks

Lifecycle events are dispatched per tenant via `WebhookService.dispatchEvent(tenantId, ...)`:

- `fulfillment.created` — on `create`.
- `fulfillment.shipped` / `fulfillment.delivered` / `fulfillment.cancelled` — on the matching `updateStatus` transition (so `markShipped` / `cancel` emit too). Other statuses (`PENDING` / `PROCESSING` / `PACKED` / `IN_TRANSIT` / `RETURNED`) do not emit. Endpoint configuration lives in the `webhook` module.

---

## Usage

```ts
import { OrderFulfillmentService } from '@/modules/order_fulfillment'

const f = await OrderFulfillmentService.create(tenantId, {
  orderId,
  carrier: 'ARAS',
  items: [{ productId, sku: 'TS-BLK-M', name: 'T-Shirt Black M', quantity: 2 }],
})

await OrderFulfillmentService.markShipped(tenantId, f.fulfillmentId, {
  carrier: 'ARAS',
  trackingNumber: '1234567890',
  trackingUrl: 'https://kargotakip.araskargo.com.tr/?code=1234567890',
})

await OrderFulfillmentService.updateStatus(tenantId, f.fulfillmentId, { status: 'DELIVERED' })
```

---

## Settings

This module exposes **no** per-tenant settings. All status / carrier / webhook policy is hardcoded (see *Tenant Variability*). The only tunable is the global `env.TENANT_CACHE_TTL` shared-infra cache TTL.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

A tenant-scoped order-fulfillment/shipment-tracking module that stores fulfillments, their items, and a status-event log per real tenant via tenantDataSourceFor, but exposes no per-tenant settings and applies all status/carrier/webhook policy uniformly (hardcoded) across tenants.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `Fulfillment` | `fulfillments` | orderId, status, carrier, trackingNumber, trackingUrl, shippingMethodId, notes, metadata, packedAt, shippedAt, deliveredAt, cancelledAt |
| `FulfillmentItem` | `fulfillment_items` | fulfillmentId, orderItemId, productId, variantId, sku, name, quantity |
| `FulfillmentEvent` | `fulfillment_events` | fulfillmentId, status, message, metadata |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `order_fulfillment.service.ts` — All reads/writes go through tenantDataSourceFor(tenantId) and every query/insert is filtered by tenantId, so each tenant sees only its own fulfillments, items, and events; this is data isolation, not behavioral branching (no method branches on per-tenant settings, providers, or subscription feature-keys).
- `order_fulfillment.service.ts:create/updateStatus` — Lifecycle webhooks (fulfillment.created / .shipped / .delivered / .cancelled) are dispatched per tenant via WebhookService.dispatchEvent(tenantId, ...), so each tenant receives events at its own configured webhook endpoints (endpoint config lives in the webhook module, not here).

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Allowed shipping carriers are a single hardcoded global enum (ARAS, YURTICI, MNG, PTT, UPS, FEDEX, DHL, TNT, CUSTOM); every tenant is offered the exact same carrier list with no way to restrict or extend it. | `order_fulfillment.enums.ts:FulfillmentCarrierEnum (validated in order_fulfillment.types.ts; set on create/addTracking/update in order_fulfillment.service.ts)` | Different tenants operate in different regions/markets (the list mixes Turkish carriers like ARAS/YURTICI/MNG/PTT with global ones); a tenant admin would plausibly want to enable only the carriers they actually ship with. Today it is a compile-time constant. | `enabledShippingCarriers` |
| Terminal-status policy (DELIVERED, CANCELLED, RETURNED) and the loose 'any forward jump allowed' transition rule are a hardcoded module-level constant set shared by all tenants. | `order_fulfillment.service.ts:TERMINAL_STATUSES (enforced in updateStatus)` | Some tenants may want stricter transition enforcement or to treat RETURNED as non-terminal (e.g. allow re-shipping a return); the workflow is currently fixed in code for everyone. | `fulfillmentTerminalStatuses` |
| The status->webhook-event mapping is hardcoded so only SHIPPED/DELIVERED/CANCELLED (plus the implicit created event) emit webhooks; PENDING/PACKED/PROCESSING/IN_TRANSIT/RETURNED never do, identically for all tenants. | `order_fulfillment.service.ts:updateStatus (statusEvent map)` | A tenant may want webhooks on additional transitions (e.g. IN_TRANSIT or RETURNED) to drive their own notifications/integrations; which transitions notify is a plausible per-tenant preference rather than a platform constant. | `fulfillmentWebhookStatuses` |
| getById cache TTL is taken from a single global env var (TENANT_CACHE_TTL, default 300s) rather than any per-tenant value. | `order_fulfillment.service.ts:CACHE_TTL` | Intentionally global shared-infra tuning (Redis cache TTL) — listed only for contrast; not a real per-tenant gap and should stay env/global. | — |

---

## Dependencies

`db`, `env`, `redis`, `logger` (declared in `module.json`). Also dispatches lifecycle events through the `webhook` module (`WebhookService`).
