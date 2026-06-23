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
