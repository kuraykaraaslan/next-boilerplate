# Procurement

- **id:** `procurement`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/procurement/`
- **tags:** procurement, purchase-order, erp
- **icon:** `fas fa-clipboard-list`
- **hasNextLayer:** true

Tenant-scoped procurement: purchase orders, their lines, and goods receipts.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `procurement.goodsReceipt.service.ts`
- `procurement.purchaseOrder.service.ts`
- `procurement.purchaseOrderLine.service.ts`
- `procurement.service.ts`

## DTOs

- `procurement.dto.ts`

## Entities

- `goods_receipt_lines.entity.ts`
- `goods_receipts.entity.ts`
- `purchase_order_lines.entity.ts`
- `purchase_orders.entity.ts`

## Enums

- `procurement.enums.ts`

## Message keys

- `procurement.messages.ts`

## Setting keys

- `procurement.setting.keys.ts`

## TypeORM entities

- `GoodsReceipt` (system) — `modules/procurement/server/entities/goods_receipts.entity.ts`
- `GoodsReceiptLine` (system) — `modules/procurement/server/entities/goods_receipt_lines.entity.ts`
- `PurchaseOrder` (system) — `modules/procurement/server/entities/purchase_orders.entity.ts`
- `PurchaseOrderLine` (system) — `modules/procurement/server/entities/purchase_order_lines.entity.ts`

## Next layer (modules_next/) surface

- `procurement/ui/procurement-purchase-orders-purchase-order-id.page` _(ui, client)_
- `procurement/ui/procurement-purchase-orders.page` _(ui, client)_
- `procurement/ui/procurement-receipts-settings.page` _(ui, client)_
- `procurement/ui/procurement-receipts.page` _(ui, client)_
- `procurement/ui/procurement-settings.page` _(ui, client)_
- `procurement/ui/purchase-order-lines-panel.component` _(ui, client)_
- `procurement/ui/purchase-order-status-badge.component` _(ui, client)_

## README

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
