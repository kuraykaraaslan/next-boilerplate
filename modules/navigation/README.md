# Navigation Module

Tenant-scoped site navigation menus (header/footer) with nested menu items.
Every row is isolated by `tenantId` and every service method takes `tenantId`
as its first argument (per `multi-tenancy-patterns.md`).

## Entities

- `NavigationMenu` (`navigation_menus`) — a named menu bound to a `location` (e.g. header/footer) with a `slug`.
- `NavigationItem` (`navigation_items`) — a `label`/`url` entry belonging to a `menuId`, optionally nested under a `parentId`, with an `order`.

## Menu

- `Menus` (`/admin/navigation`) — manage a tenant's navigation menus.

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
