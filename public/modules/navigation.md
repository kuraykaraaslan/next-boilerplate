# Navigation

- **id:** `navigation`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/navigation/`
- **tags:** navigation, menu, cms, content
- **icon:** `fas fa-bars`
- **hasNextLayer:** true

Tenant-scoped site navigation menus (header/footer) with nested menu items.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `navigation.item.service.ts`
- `navigation.service.ts`

## DTOs

- `navigation.dto.ts`

## Entities

- `navigation_items.entity.ts`
- `navigation_menus.entity.ts`

## Message keys

- `navigation.messages.ts`

## TypeORM entities

- `NavigationItem` (system) — `modules/navigation/server/entities/navigation_items.entity.ts`
- `NavigationMenu` (system) — `modules/navigation/server/entities/navigation_menus.entity.ts`

## Next layer (modules_next/) surface

- `navigation/ui/navigation-items-panel.component` _(ui, client)_
- `navigation/ui/navigation-menu-id.page` _(ui, client)_
- `navigation/ui/navigation.page` _(ui, client)_

## README

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
