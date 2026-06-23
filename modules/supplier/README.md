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
