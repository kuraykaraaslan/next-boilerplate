# Orders

- **id:** `order`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/order/`
- **tags:** order, sales, commerce, erp
- **icon:** `fas fa-receipt`
- **hasNextLayer:** true

Tenant-scoped core sales orders, order lines and status events. Bridges Commerce and ERP.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `order.line.service.ts`
- `order.service.ts`

## DTOs

- `order.dto.ts`

## Entities

- `order_lines.entity.ts`
- `order_status_events.entity.ts`
- `orders.entity.ts`

## Enums

- `order.enums.ts`

## Message keys

- `order.messages.ts`

## Setting keys

- `order.setting.keys.ts`

## TypeORM entities

- `Order` (system) — `modules/order/server/entities/orders.entity.ts`
- `OrderLine` (system) — `modules/order/server/entities/order_lines.entity.ts`
- `OrderStatusEvent` (system) — `modules/order/server/entities/order_status_events.entity.ts`

## Next layer (modules_next/) surface

- `order/ui/order-lines-panel.component` _(ui, client)_
- `order/ui/order-settings.page` _(ui, client)_
- `order/ui/order-status-badge.component` _(ui, client)_
- `order/ui/orders-order-id.page` _(ui, client)_
- `order/ui/orders.page` _(ui, client)_

## README

# Order Module

Tenant-scoped core sales orders that bridge Commerce and ERP. Every row is
isolated by `tenantId` and every service method takes `tenantId` as its first
argument (per `multi-tenancy-patterns.md`).

> Scaffolded skeleton — entities, types and DTOs are in place; service methods
> and API routes are future work.

## Entities

- `Order` (`orders`) — `number`, `customerId`, `status` (`DRAFT`/`PENDING`/`PAID`/`FULFILLED`/`CANCELLED`/`REFUNDED`), `currency`, `total`, `placedAt`. Soft-deletable.
- `OrderLine` (`order_lines`) — `orderId`, `productId`, `variantId`, `description`, `quantity`, `unitPrice`.
- `OrderStatusEvent` (`order_status_events`) — `orderId`, `status`, `note` — an append-only status timeline.

## Public API

Import from the barrel `@/modules/order`:

| Export | Type | Use |
|---|---|---|
| `OrderService` | class | Order/line/status-event management (placeholder) |
| `Create*DTO` | Zod | Input validation |
| `Safe*Schema` | Zod | Output filtering (omits `deletedAt`) |
| `OrderStatusEnum` | Zod | Order status values |
| `ORDER_MESSAGES` | object | Error/message constants |

## Menu

- **Orders** — `/admin/orders` (ERP workspace, *Sales* group)
- **Orders** — `/admin/orders` (Commerce workspace, *Orders* group)

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
