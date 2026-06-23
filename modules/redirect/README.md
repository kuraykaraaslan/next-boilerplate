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
