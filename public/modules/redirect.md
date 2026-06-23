# Redirects

- **id:** `redirect`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/redirect/`
- **tags:** redirect, seo, cms, content
- **icon:** `fas fa-arrow-right-arrow-left`
- **hasNextLayer:** true

Tenant-scoped URL redirect (301/302) rules for SEO-safe content moves.

## Dependencies

- **requires:** `db`, `env`, `redis`, `logger`, `setting`

## Services

- `redirect.service.ts`

## DTOs

- `redirect.dto.ts`

## Entities

- `redirect_rules.entity.ts`

## Message keys

- `redirect.messages.ts`

## TypeORM entities

- `RedirectRule` (system) — `modules/redirect/server/entities/redirect_rules.entity.ts`

## Next layer (modules_next/) surface

- `redirect/ui/redirects.page` _(ui, client)_

## README

# Redirect Module

Tenant-scoped URL redirect (301/302) rules for SEO-safe content moves. Every row
is isolated by `tenantId` and service methods take `tenantId` as their first
argument (per `multi-tenancy-patterns.md`).

> Scaffolded skeleton — entities, types and a placeholder service/page only.
> Business logic and API routes are coming soon.

## Public API

Import from the barrel `@/modules/redirect`:

| Export | Type | Use |
|---|---|---|
| `RedirectService` | class | Redirect-rule CRUD + lookup (placeholder) |
| `Create*DTO` | Zod | Input validation |
| `Safe*Schema` | Zod | Output filtering (omits `deletedAt`) |
| `REDIRECT_MESSAGES` | object | Error/message constants |

## Entities

- `RedirectRule` (`redirect_rules`) — `fromPath`, `toPath`, `statusCode` (301/302), `isActive`, `hits`.

## Menu

- **Redirects** (`/admin/redirects`, workspace `content`) — manage redirect rules.

## Dependencies

`db`, `env`, `redis`, `logger`, `setting`.
