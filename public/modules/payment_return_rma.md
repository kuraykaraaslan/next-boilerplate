# Payment Return / RMA

- **id:** `payment_return_rma`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_return_rma/`
- **tags:** return, rma, refund, ecommerce
- **icon:** `fas fa-rotate-left`
- **hasNextLayer:** false

Customer return, exchange and refund (RMA) requests with line items and an append-only status-event log. Tenant-aware, references orders from a future order module.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `payment_sell`

## Services

- `payment_return_rma.service.ts`

## DTOs

- `payment_return_rma.dto.ts`

## Entities

- `return_event.entity.ts`
- `return_item.entity.ts`
- `return_request.entity.ts`

## Enums

- `payment_return_rma.enums.ts`

## Message keys

- `payment_return_rma.messages.ts`

## TypeORM entities

- `ReturnEvent` (system) — `modules/payment_return_rma/entities/return_event.entity.ts`
- `ReturnItem` (system) — `modules/payment_return_rma/entities/return_item.entity.ts`
- `ReturnRequest` (system) — `modules/payment_return_rma/entities/return_request.entity.ts`

## README

# payment_return_rma

Tenant-aware customer **return / exchange / refund (RMA)** workflow. Admin + customer facing service layer — no UI. Mirrors the status-event-log pattern used by `order_fulfillment`.

A return request groups the line items a customer wants to send back, carries a human-readable `rmaNumber` (e.g. `RMA-1A2B3C4D`), and accumulates an append-only audit trail of status changes.

## Domain model

- **ReturnRequest** (`return_requests`) — the RMA header. Tenant-scoped, references an `orderId` (external, from a future `order` module — plain indexed uuid, no FK). Holds `rmaNumber`, `type`, `status`, customer/admin notes, `refundAmount`, `currency`, and lifecycle timestamps (`approvedAt`, `receivedAt`, `refundedAt`, `cancelledAt`). Soft-deletable.
- **ReturnItem** (`return_items`) — one returned line. Links back to `returnRequestId`, optionally to an `orderItemId` / `productId` / `variantId`, with `sku`, `name`, `quantity`, per-line `reason` and physical `condition` (`UNOPENED` | `USED` | `DAMAGED` | `DEFECTIVE` | `OTHER`).
- **ReturnEvent** (`return_events`) — append-only log of every status change, with optional `message` and `metadata`.

## Status lifecycle

```
REQUESTED → APPROVED → RECEIVED → REFUNDED → COMPLETED
                │
                └─ REJECTED
(any non-terminal) ─→ CANCELLED
```

`COMPLETED`, `CANCELLED`, and `REJECTED` are **terminal** — any mutation against a request already in one of these throws `INVALID_STATUS_TRANSITION`. Transitions are validated loosely (terminal-guard only), not as a strict state machine.

## Types

- `RETURN` — goods sent back for a refund.
- `EXCHANGE` — goods swapped for a replacement.
- `REFUND` — money-only refund without physical return.

## Service methods

`PaymentReturnRmaService` — all static.

| Method | Description |
| --- | --- |
| `create(tenantId, dto)` | Generates `rmaNumber`, inserts request + items, logs initial `REQUESTED` event. |
| `getById(tenantId, id)` | Returns request with `items` + `events` (cached via `singleFlight`). |
| `list(tenantId, query)` | Paginated list, filterable by `orderId`, `userId`, `status`, `type`, `rmaNumber`. |
| `update(tenantId, id, dto)` | Patch `adminNote` / `refundAmount` / `metadata`. |
| `approve(tenantId, id, dto?)` | → `APPROVED`, sets `approvedAt`, logs event. |
| `reject(tenantId, id, dto?)` | → `REJECTED`, logs event. |
| `markReceived(tenantId, id)` | → `RECEIVED`, sets `receivedAt`, logs event. |
| `refund(tenantId, id, dto)` | → `REFUNDED`, sets `refundedAt` + `refundAmount`, logs event. |
| `complete(tenantId, id)` | → `COMPLETED`, logs event. |
| `cancel(tenantId, id, reason?)` | → `CANCELLED`, sets `cancelledAt`, logs event. |
| `listEvents(tenantId, id)` | Returns the full append-only event log, oldest first. |

> `refund()` is integrated with **`payment_sell`**. When the return is linked to a payment — `paymentId` set at `create()` time or passed to `refund()` — it issues the actual refund via `PaymentSellService.refund(tenantId, paymentId, { amount?, reason? })`; a provider failure aborts with `REFUND_FAILED`. Without a `paymentId` it falls back to a manual/no-charge refund that only records `refundAmount` on the RMA (e.g. cash-on-delivery, store credit).

## Cache keys

- `rma:<returnRequestId>` — the `getById` aggregate (request + items + events), written through `singleFlight` and busted via `redis.del` on every mutation.

## Dependencies

`db`, `env`, `redis`, `logger`.

## Usage

```ts
import { PaymentReturnRmaService } from '@/modules/payment_return_rma'

// Create an RMA
const rma = await PaymentReturnRmaService.create(tenantId, {
  orderId,
  userId,
  type: 'RETURN',
  reason: 'Wrong size',
  currency: 'USD',
  items: [
    { name: 'T-Shirt M', quantity: 1, condition: 'UNOPENED', orderItemId },
  ],
})

// Move it through the lifecycle
await PaymentReturnRmaService.approve(tenantId, rma.returnRequestId, { note: 'Approved by support' })
await PaymentReturnRmaService.markReceived(tenantId, rma.returnRequestId)
await PaymentReturnRmaService.refund(tenantId, rma.returnRequestId, { refundAmount: 19.99 })
await PaymentReturnRmaService.complete(tenantId, rma.returnRequestId)

// Inspect the audit trail
const events = await PaymentReturnRmaService.listEvents(tenantId, rma.returnRequestId)
```
