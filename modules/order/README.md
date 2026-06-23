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
