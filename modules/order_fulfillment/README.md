# order_fulfillment

Tenant-aware fulfillment and shipment tracking for orders. Framework-agnostic — no `next/*`, `react`, or browser APIs.

`orderId` is an external uuid reference — there is **no** `order` module yet, so it is stored as a plain indexed column (no TypeORM relation/FK). `shippingMethodId` is an optional reference to a method in `payment_shipping`.

## Domain model

- **Fulfillment** (`fulfillments`) — one shipment of an order. Holds `status`, carrier + tracking info, an optional `shippingMethodId`, free-form `notes`/`metadata`, and lifecycle timestamps (`packedAt`, `shippedAt`, `deliveredAt`, `cancelledAt`). Soft-deletable.
- **FulfillmentItem** (`fulfillment_items`) — the line items packed into a fulfillment. Each carries optional `orderItemId` / `productId` / `variantId` / `sku` plus a `name` and `quantity`.
- **FulfillmentEvent** (`fulfillment_events`) — append-only status-change log. Every create / tracking change / status update writes one row.

All three entities are scoped by an indexed `tenantId`.

## Status lifecycle

```
PENDING → PROCESSING → PACKED → SHIPPED → IN_TRANSIT → DELIVERED
                                                  │
                                       (terminal) │
   CANCELLED ◄───────── any non-terminal ─────────┤
   RETURNED  ◄──────────────────────────────────── 
```

`DELIVERED`, `CANCELLED`, and `RETURNED` are **terminal** — `updateStatus` throws `INVALID_STATUS_TRANSITION` if you try to move out of them. Transitions are otherwise validated loosely (any forward jump is allowed). Reaching `PACKED` / `SHIPPED` / `DELIVERED` / `CANCELLED` stamps the matching timestamp once.

## Service

`OrderFulfillmentService` — static methods, all take `tenantId` first.

| Method | Description |
| --- | --- |
| `create(tenantId, dto)` | Insert a fulfillment + its items + an initial `PENDING` event. Returns `FulfillmentWithItems`. |
| `getById(tenantId, fulfillmentId)` | Fetch fulfillment with `items` and `events` (ordered). `singleFlight`-cached. |
| `list(tenantId, query)` | Paginated list filtered by `orderId` / `status` / `carrier` / `trackingNumber`. Returns `{ data, total }`. |
| `update(tenantId, fulfillmentId, dto)` | Patch carrier / tracking / notes / metadata. |
| `addTracking(tenantId, fulfillmentId, dto)` | Set carrier + tracking number/url and log an event. |
| `updateStatus(tenantId, fulfillmentId, dto)` | Change status, stamp the matching timestamp, append an event. Enforces terminal-state rule. |
| `markShipped(tenantId, fulfillmentId, tracking?)` | Convenience: optional tracking then status `SHIPPED`. |
| `cancel(tenantId, fulfillmentId, reason?)` | Status `CANCELLED` + event. |
| `listEvents(tenantId, fulfillmentId)` | Full event log, oldest first. |

## Cache keys

- `order:fulfillment:<fulfillmentId>` — `getById` result (`FulfillmentWithItems`). Busted on every mutation (`update`, `addTracking`, `updateStatus`, and the convenience methods that wrap them).

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

## Dependencies

`db`, `env`, `redis`, `logger`.
