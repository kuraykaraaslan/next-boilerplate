# Suppliers

- **id:** `supplier`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/supplier/`
- **tags:** supplier, vendor, procurement, erp
- **icon:** `fas fa-truck`
- **hasNextLayer:** true

Tenant-scoped supplier/vendor master records and their contacts.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `supplier.category.service.ts`
- `supplier.contact.service.ts`
- `supplier.service.ts`

## DTOs

- `supplier.dto.ts`

## Entities

- `supplier_categories.entity.ts`
- `supplier_contacts.entity.ts`
- `suppliers.entity.ts`

## Message keys

- `supplier.messages.ts`

## TypeORM entities

- `Supplier` (system) — `modules/supplier/server/entities/suppliers.entity.ts`
- `SupplierCategory` (system) — `modules/supplier/server/entities/supplier_categories.entity.ts`
- `SupplierContact` (system) — `modules/supplier/server/entities/supplier_contacts.entity.ts`

## Next layer (modules_next/) surface

- `supplier/ui/supplier-categories.page` _(ui, client)_
- `supplier/ui/supplier-contacts-panel.component` _(ui, client)_
- `supplier/ui/suppliers-supplier-id.page` _(ui, client)_
- `supplier/ui/suppliers.page` _(ui, client)_

## README

# Supplier Module

Tenant-scoped supplier/vendor master records and their contacts. Every row is
isolated by `tenantId` and every service method takes `tenantId` as its first
argument (per `multi-tenancy-patterns.md`).

> Scaffolded skeleton — entities, types and barrel exports only. Service methods
> and API routes are future work.

## Public API

Import from the barrel `@/modules/supplier`:

| Export | Type | Use |
|---|---|---|
| `SupplierService` | class | Supplier + contact CRUD (placeholder) |
| `Create*DTO` | Zod | Input validation |
| `Safe*Schema` | Zod | Output filtering (omits `deletedAt`) |
| `SUPPLIER_MESSAGES` | object | Error/message constants |

## Entities

- `Supplier` (`suppliers`) — vendor master record: `name`, `code`, `email`, `phone`, `taxNumber`, `isActive` (soft-deletable).
- `SupplierContact` (`supplier_contacts`) — a person at a supplier: `supplierId`, `name`, `email`, `phone`, `role`.

## Menu

- `Suppliers` → `/admin/suppliers` (group `Procurement`, workspace `erp`).

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
