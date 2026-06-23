# Inventory

- **id:** `inventory`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/inventory/`
- **tags:** inventory, warehouse, stock, erp
- **icon:** `fas fa-warehouse`
- **hasNextLayer:** true

Tenant-scoped inventory: warehouses, stock locations, stock items, movements and counts.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `inventory.count.service.ts`
- `inventory.countLine.service.ts`
- `inventory.movement.service.ts`
- `inventory.reason.service.ts`
- `inventory.service.ts`
- `inventory.stockItem.service.ts`
- `inventory.uom.service.ts`
- `inventory.warehouse.service.ts`

## DTOs

- `inventory.dto.ts`

## Entities

- `inventory_count_lines.entity.ts`
- `inventory_counts.entity.ts`
- `inventory_locations.entity.ts`
- `inventory_movement_reasons.entity.ts`
- `inventory_movements.entity.ts`
- `inventory_stock_items.entity.ts`
- `inventory_warehouses.entity.ts`
- `uoms.entity.ts`

## Enums

- `inventory.enums.ts`

## Message keys

- `inventory.messages.ts`

## TypeORM entities

- `InventoryCount` (system) — `modules/inventory/server/entities/inventory_counts.entity.ts`
- `InventoryCountLine` (system) — `modules/inventory/server/entities/inventory_count_lines.entity.ts`
- `InventoryLocation` (system) — `modules/inventory/server/entities/inventory_locations.entity.ts`
- `InventoryMovement` (system) — `modules/inventory/server/entities/inventory_movements.entity.ts`
- `InventoryStockItem` (system) — `modules/inventory/server/entities/inventory_stock_items.entity.ts`
- `InventoryWarehouse` (system) — `modules/inventory/server/entities/inventory_warehouses.entity.ts`
- `MovementReason` (system) — `modules/inventory/server/entities/inventory_movement_reasons.entity.ts`
- `UnitOfMeasure` (system) — `modules/inventory/server/entities/uoms.entity.ts`

## Next layer (modules_next/) surface

- `inventory/ui/count-lines-panel.component` _(ui, client)_
- `inventory/ui/count-status-badge.component` _(ui, client)_
- `inventory/ui/inventory-counts-count-id.page` _(ui, client)_
- `inventory/ui/inventory-counts-settings.page` _(ui, client)_
- `inventory/ui/inventory-counts.page` _(ui, client)_
- `inventory/ui/inventory-movements-settings.page` _(ui, client)_
- `inventory/ui/inventory-movements.page` _(ui, client)_
- `inventory/ui/inventory-settings.page` _(ui, client)_
- `inventory/ui/inventory-stock-settings.page` _(ui, client)_
- `inventory/ui/inventory-stock.page` _(ui, client)_
- `inventory/ui/inventory-warehouses-settings.page` _(ui, client)_
- `inventory/ui/inventory-warehouses.page` _(ui, client)_
- `inventory/ui/movement-reasons-panel.component` _(ui, client)_
- `inventory/ui/uoms-panel.component` _(ui, client)_

## README

# Inventory Module

Tenant-scoped inventory management: warehouses, stock locations, stock items,
movements and counts. Every row is isolated by `tenantId` and service methods
take `tenantId` as their first argument (per `multi-tenancy-patterns.md`).

> Scaffolded skeleton — entities and types are in place; service logic and API
> routes are coming soon.

## Entities

- `InventoryWarehouse` (`inventory_warehouses`) — a stock-holding site with `name`, `code` and `isActive` flag (soft-deletable).
- `InventoryLocation` (`inventory_locations`) — a bin/zone within a warehouse, keyed by `warehouseId` (soft-deletable).
- `InventoryStockItem` (`inventory_stock_items`) — on-hand `quantity`/`reserved` for a `sku` at a `warehouseId`/`locationId`, optionally linked to `productId`/`variantId`.
- `InventoryMovement` (`inventory_movements`) — a stock change for a `stockItemId` with a `type` (`IN`/`OUT`/`TRANSFER`/`ADJUSTMENT`) and `quantity`.
- `InventoryCount` (`inventory_counts`) — a stocktake against a `warehouseId` with a `status` and `countedAt` (soft-deletable).

## Menu items

- **Warehouses** — `/admin/inventory/warehouses`
- **Stock** — `/admin/inventory/stock`
- **Movements** — `/admin/inventory/movements`
- **Counts** — `/admin/inventory/counts`

All live in the `Inventory` group of the `erp` workspace, tenant-scoped.

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
