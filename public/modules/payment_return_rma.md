# Payment Return / RMA

- **id:** `payment_return_rma`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_return_rma/`
- **tags:** return, rma, refund, ecommerce
- **icon:** `fas fa-rotate-left`
- **hasNextLayer:** true

Customer return, exchange and refund (RMA) requests with line items and an append-only status-event log. Tenant-aware, references orders from a future order module.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `payment_sell`

## Services

- `payment_return_rma.crud.service.ts`
- `payment_return_rma.lifecycle.service.ts`
- `payment_return_rma.line.service.ts`
- `payment_return_rma.policy.service.ts`
- `payment_return_rma.reason.service.ts`
- `payment_return_rma.service.ts`

## DTOs

- `payment_return_rma.dto.ts`

## Entities

- `return_event.entity.ts`
- `return_item.entity.ts`
- `return_reason.entity.ts`
- `return_request.entity.ts`

## Enums

- `payment_return_rma.enums.ts`

## Message keys

- `payment_return_rma.messages.ts`

## TypeORM entities

- `ReturnEvent` (system) — `modules/payment_return_rma/server/entities/return_event.entity.ts`
- `ReturnItem` (system) — `modules/payment_return_rma/server/entities/return_item.entity.ts`
- `ReturnReason` (system) — `modules/payment_return_rma/server/entities/return_reason.entity.ts`
- `ReturnRequest` (system) — `modules/payment_return_rma/server/entities/return_request.entity.ts`

## Next layer (modules_next/) surface

- `payment_return_rma/ui/return-lines-panel.component` _(ui, client)_
- `payment_return_rma/ui/return-reasons-panel.component` _(ui, client)_
- `payment_return_rma/ui/return-settings.page` _(ui, client)_
- `payment_return_rma/ui/return-status-badge.component` _(ui, client)_
- `payment_return_rma/ui/returns-return-id.page` _(ui, client)_
- `payment_return_rma/ui/returns.page` _(ui, client)_

## README

# Payment Return Rma Module

Tenant-aware customer **return / exchange / refund (RMA)** workflow. Admin + customer facing service layer — no UI, no API routes. A return request groups the line items a customer wants to send back, carries a human-readable `rmaNumber` (e.g. `RMA-1A2B3C4D`), and accumulates an append-only audit trail of status changes. Mirrors the status-event-log pattern used by `order_fulfillment`.

---

## Entities

All three live in the **tenant DB** (resolved per real tenant via `tenantDataSourceFor(tenantId)`).

| Entity | Table | Description |
|---|---|---|
| `ReturnRequest` | `return_requests` | RMA header. References an external `orderId` (future `order` module — plain indexed uuid, no FK) and an optional `paymentId` (link to `payment_sell`). Holds `rmaNumber`, `type`, `status`, `reason`, `customerNote`, `adminNote`, `refundAmount`, `currency`, `metadata`, and lifecycle timestamps (`approvedAt`, `receivedAt`, `refundedAt`, `cancelledAt`). Soft-deletable (`deletedAt`). |
| `ReturnItem` | `return_items` | One returned line. Links back to `returnRequestId`, optionally to `orderItemId` / `productId` / `variantId`, with `sku`, `name`, `quantity`, per-line `reason` and physical `condition`. |
| `ReturnEvent` | `return_events` | Append-only log of every status change, with optional `message` and `metadata`. |

---

## Enums

- **`ReturnTypeEnum`** — `RETURN` (goods sent back for a refund), `EXCHANGE` (goods swapped for a replacement), `REFUND` (money-only refund without physical return).
- **`ReturnStatusEnum`** — `REQUESTED`, `APPROVED`, `REJECTED`, `RECEIVED`, `REFUNDED`, `COMPLETED`, `CANCELLED`.
- **`ReturnItemConditionEnum`** — `UNOPENED`, `USED`, `DAMAGED`, `DEFECTIVE`, `OTHER`.

### Status lifecycle

```
REQUESTED → APPROVED → RECEIVED → REFUNDED → COMPLETED
                │
                └─ REJECTED
(any non-terminal) ─→ CANCELLED
```

`COMPLETED`, `CANCELLED`, and `REJECTED` are **terminal** (`TERMINAL_STATUSES`) — any mutation against a request already in one of these throws `INVALID_STATUS_TRANSITION`. Transitions are validated loosely (terminal-guard only via `loadMutable`), not as a strict state machine.

---

## Service

`PaymentReturnRmaService` — all methods static.

| Method | Description |
|---|---|
| `create(tenantId, dto)` | Generates `rmaNumber`, inserts request + items, logs the initial `REQUESTED` event, returns the aggregate. |
| `getById(tenantId, id)` | Returns the request with `items` + `events` (cached via `singleFlight`). Throws `RETURN_NOT_FOUND` if missing. |
| `list(tenantId, query)` | Paginated list, filterable by `orderId`, `userId`, `status`, `type`, `rmaNumber`. Returns `{ data, total }`. |
| `update(tenantId, id, dto)` | Patch `adminNote` / `refundAmount` / `metadata`. |
| `approve(tenantId, id, dto?)` | → `APPROVED`, sets `approvedAt` (once), logs event. |
| `reject(tenantId, id, dto?)` | → `REJECTED`, logs event. |
| `markReceived(tenantId, id)` | → `RECEIVED`, sets `receivedAt` (once), logs event. |
| `refund(tenantId, id, dto)` | → `REFUNDED`, sets `refundedAt` (once) + `refundAmount`, logs event. Validates `refundAmount >= 0` (`INVALID_REFUND_AMOUNT`). |
| `complete(tenantId, id)` | → `COMPLETED`, logs event. |
| `cancel(tenantId, id, reason?)` | → `CANCELLED`, sets `cancelledAt` (once), logs event. |
| `listEvents(tenantId, id)` | Returns the full append-only event log, oldest first. |

`logEvent` and `loadMutable` are private internals; `logEvent` failures are caught and logged (`EVENT_LOG_FAILED`) without aborting the mutation.

### Refund integration (`payment_sell`)

`refund()` is integrated with **`payment_sell`**. When the return is linked to a payment — `paymentId` set at `create()` time or passed to `refund()` — it issues the actual refund via `PaymentSellService.refund(tenantId, paymentId, { amount?, reason? })`, which resolves the tenant's configured payment provider; a provider failure aborts with `REFUND_FAILED`. Without a `paymentId` it falls back to a manual/no-charge refund that only records `refundAmount` on the RMA (e.g. cash-on-delivery, store credit).

---

## Caching

- `rma:<returnRequestId>` — the `getById` aggregate (request + items + events), written through `singleFlight` (TTL `env.TENANT_CACHE_TTL ?? 300`s) and busted via `redis.del` on every mutation.

---

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

---

## Settings

This module declares **no settings of its own**.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages customer return/exchange/refund (RMA) requests, line items, and an append-only status-event log, all stored per real tenant via tenantDataSourceFor(tenantId); it declares no settings of its own and delegates actual refunds to the tenant-aware payment_sell module.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `ReturnRequest` | `return_requests` | orderId, paymentId, userId, rmaNumber, type, status, reason, customerNote, adminNote, refundAmount, currency, metadata |
| `ReturnItem` | `return_items` | returnRequestId, orderItemId, productId, variantId, sku, name, quantity, reason, condition |
| `ReturnEvent` | `return_events` | returnRequestId, status, message, metadata |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_return_rma.service.ts:refund` — When a request has a linked paymentId, the refund is issued through PaymentSellService.refund(tenantId, paymentId, ...), which resolves the tenant's configured payment provider, so refund execution varies per tenant's payment_sell config; without a paymentId it is a manual record-only refund.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Default currency hardcoded to 'USD' for new return requests | `payment_return_rma.dto.ts (CreateReturnDTO.currency .default('USD')) and return_request.entity.ts (currency column default 'USD')` | Each tenant typically operates in its own primary currency (the seed already creates EUR requests); when a caller omits currency, the request silently defaults to USD instead of the tenant's currency, which can mis-record refund/return amounts. | `defaultReturnCurrency` |
| RMA return policy (eligibility/return window, auto-approval, who may approve) is not modeled or enforced; the status lifecycle and TERMINAL_STATUSES set are global constants, and policy values (e.g. policyWindowDays: 30) only live as free-form per-request metadata | `payment_return_rma.service.ts (TERMINAL_STATUSES, loadMutable, approve/reject/refund) — policy hinted in payment_return_rma.seed.ts metadata (policyWindowDays)` | Return-window length, auto-approve thresholds, and approval requirements are classic per-tenant business policy; today they are not configurable, so every tenant is bound to the same hardcoded lifecycle and must enforce windows manually via free-text adminNote/metadata. | `returnWindowDays` |
| RMA number format/prefix is hardcoded as 'RMA-' + random 8 hex chars | `payment_return_rma.service.ts (create: rmaNumber = `RMA-${randomUUID().slice(0,8).toUpperCase()}`)` | Tenants commonly want their own RMA numbering scheme/prefix for customer-facing identifiers; the prefix and format are global and cannot be branded per tenant. | `rmaNumberPrefix` |

---

## Dependencies

`db`, `env`, `redis`, `logger`, `payment_sell`.
