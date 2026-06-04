# notification_log — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `notification_log.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 1m / 3l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `notification_log.service.ts` | 93 | Tenant-scoped outbound notification audit: `log` (best-effort write), `list` (paginated query), `getById` (single fetch). |

## Findings

### 🟡 Medium
- **[Dimension 2 — Boundary validation] No `Safe*Schema` on DB output** — `list` and `getById` return raw `NotificationLog` entities directly, including the free-text `error` column (entity `text` column) which can hold provider error detail (e.g. SMTP/SMS gateway messages). Nothing filters the shape before it leaves the service. Evidence: `modules/notification_log/notification_log.service.ts:85`, `modules/notification_log/notification_log.service.ts:91`. Rule: `validation-philosophy.md`. Fix: add a `SafeNotificationLogSchema` and map rows through it before returning.

### 🔵 Low
- **[Dimension 2 — Boundary validation] Inline interfaces instead of Zod/DTO** — `NotificationLogOpts` and `NotificationLogQuery` are declared as bare TS interfaces in the service file; pagination clamping (`Math.min(query.limit ?? 50, 200)`) is ad-hoc inside the service rather than validated at a route. Evidence: `modules/notification_log/notification_log.service.ts:9`, `modules/notification_log/notification_log.service.ts:82`. Rule: `zod-validation.md`. Fix: move query/opts shapes to a `.dto.ts` with Zod and validate at the route.
- **[Dimension 5 — DB access / entity ownership] Untyped `where` clause** — `list` builds its filter as an untyped `Record<string, unknown>` rather than a typed `FindOptionsWhere<NotificationLog>`, weakening compile-time guarantees on filter keys. (`getById` honestly returns `NotificationLog | null`, so the nullable return is not a defect.) Evidence: `modules/notification_log/notification_log.service.ts:73`. Rule: `database-patterns.md`. Fix: type `where` as `FindOptionsWhere<NotificationLog>`.
- **[Dimension 13 — Naming / organization] Service-local types should live in `.types.ts`** — channel/status union types live in the entity and request shapes (`NotificationLogOpts`, `NotificationLogQuery`) in the service; the module has no `.types.ts`/`.dto.ts` separation. Evidence: `modules/notification_log/notification_log.service.ts:9-22`. Rule: `file-organization.md`. Fix: extract shared request types into `notification_log.types.ts`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class`, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | No Zod DTO; no `Safe*` output schema on returned entities. |
| 3 | Error handling | ✅ | No raw `throw new Error`. `log` swallows write failures (correct for best-effort audit); `list`/`getById` let infra errors propagate. |
| 4 | Messages pattern | ✅ | No user-facing inline strings; only string is a `Logger.warn` log line (allowed). No messages file required. |
| 5 | DB access / entity ownership | ⚠️ | DB only in service, entity under `entities/`, nullable return honest; `where` is untyped. |
| 6 | Multi-tenancy | ✅ | All three methods use `tenantDataSourceFor(tenantId)` and filter `where.tenantId`. No cross-tenant leak. |
| 7 | Authorization / RBAC | ⚠️ | No in-service ownership check; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | No sub-service cross-imports; consumed via `@/` alias by channel services. |
| 9 | Caching | — | N/A — audit log, write-mostly; no hot read path requiring cache. |
| 10 | Secrets / config | ✅ | No `process.env.X`; no secrets handled. |
| 11 | Logging / audit | ✅ | This module *is* the audit sink; `log` is fire-and-forget; failure logged via `Logger.warn` with message only, no secret leak. |
| 12 | Security hardening | ✅ | `limit` clamped to 200; no injection (parameterized repo API); empty `tenantId`/`recipient` short-circuited in `log`. |
| 13 | Naming / file organization | ⚠️ | snake_case module, kebab/PascalCase correct; request types not split into `.types.ts`/`.dto.ts`. |

## Recommendations
1. Add `SafeNotificationLogSchema` and project `list`/`getById` output through it to avoid leaking the raw `error` text column to callers.
2. Move `NotificationLogQuery`/`NotificationLogOpts` into a `notification_log.dto.ts` with Zod, validate at the consuming route, and type `where` as `FindOptionsWhere<NotificationLog>`.
3. Extract shared union/request types into `notification_log.types.ts`.

## References
- Rules: `validation-philosophy.md`, `zod-validation.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `error-handling-and-app-error.md`, `file-organization.md` · Source: `modules/notification_log/notification_log.service.ts`, `modules/notification_log/entities/notification_log.entity.ts`
