# Procurement Module

Tenant-scoped procurement: purchase orders, their lines, and goods receipts.
Every row is isolated by `tenantId` and every service method takes `tenantId`
as its first argument (per `multi-tenancy-patterns.md`).

> Scaffolded skeleton — entities and types are defined; service logic and API
> routes are future work.

## Entities

- `PurchaseOrder` (`purchase_orders`) — a supplier order with `number`, `status` (`DRAFT`/`ORDERED`/`RECEIVED`/`CANCELLED`), `currency`, `total`, `orderedAt`.
- `PurchaseOrderLine` (`purchase_order_lines`) — a line on a purchase order with `productId`, `description`, `quantity`, `unitPrice`.
- `GoodsReceipt` (`goods_receipts`) — a receipt against a purchase order with `number`, `status`, `receivedAt`.
- `GoodsReceiptLine` (`goods_receipt_lines`) — a received line linking a receipt back to a `purchaseOrderLineId` with a `quantity`.

## Menu

- **Purchase Orders** — `/admin/procurement/purchase-orders` (workspace `erp`).
- **Goods Receipts** — `/admin/procurement/receipts` (workspace `erp`).

## Public API

Import from the barrel `@/modules/procurement`:

| Export | Type | Use |
|---|---|---|
| `ProcurementService` | class | Service facade (TODO) |
| `PurchaseOrderStatusEnum` | Zod | Status enum |
| `Create*DTO` | Zod | Input validation stubs |
| `Safe*Schema` | Zod | Output filtering (omits `deletedAt`) |
| `PROCUREMENT_MESSAGES` | object | Error/message constants |

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
