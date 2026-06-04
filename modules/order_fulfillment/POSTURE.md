# order_fulfillment — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** order_fulfillment.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 2m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| order_fulfillment.service.ts | 235 | CRUD + status lifecycle for order fulfillments, tracking, domain event log, webhook dispatch |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — Every error in the service throws `new Error(ORDER_FULFILLMENT_MESSAGES.X)` rather than `new AppError(message, statusCode, ErrorCode.X)`. A route handler cannot derive an HTTP status (404 for not-found, 409 for invalid transition, 500 for create failure) from a raw `Error`. Evidence: `modules/order_fulfillment/order_fulfillment.service.ts:76` (create failed → should be 500/INTERNAL_ERROR), `:88`, `:129`, `:141`, `:163` (not found → should be 404/NOT_FOUND), `:167` (invalid status transition → should be 409/CONFLICT). Rule: `error-handling-and-app-error.md`. Fix: import `{ AppError, ErrorCode }` from `@/modules/common/app-error` and throw `new AppError(msg, 404, ErrorCode.NOT_FOUND)` / `409, ErrorCode.CONFLICT` / `500, ErrorCode.INTERNAL_ERROR` as appropriate.
- **[Dimension 5 — DB access] Multi-write `create()` is not transactional** — `create()` performs three independent writes (fulfillment save `:51`, items save `:63`, initial event via `logEvent` `:65`) plus a webhook dispatch with no surrounding transaction. A failure after the fulfillment row is saved leaves an orphaned fulfillment with no items, and the bare catch at `:74-77` swallows the real cause and rethrows a generic message. Evidence: `modules/order_fulfillment/order_fulfillment.service.ts:51-65`. Rule: `database-patterns.md` (transactions for multi-write operations). Fix: wrap the fulfillment + items + initial event writes in `ds.transaction(async (mgr) => { ... })`, and dispatch the webhook only after commit.

### 🟡 Medium
- **[Dimension 7 — Authorization] No resource-level ownership/role check in service** — The service trusts the `tenantId` argument and performs no in-service RBAC or order-ownership verification. authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Evidence: `modules/order_fulfillment/order_fulfillment.service.ts:36,125,159`. Rule: `authorization-and-rbac.md`. Fix: confirm route/middleware enforces tenant membership + RBAC; optionally add a feature/subscription gate for fulfillment if it is a paid capability.
- **[Dimension 11 — Logging/audit] Mutations not audit-logged; webhook dispatch can abort the flow** — Status transitions, tracking changes, cancellation and creation are persisted to `fulfillment_events` (a domain log), but no fire-and-forget audit-log entry is written for these meaningful admin actions (a convention used elsewhere in the repo, e.g. `invoice`, `scim`, `tenant_export`). Separately, the webhook dispatch in `updateStatus` at `:186` is awaited with no surrounding try/catch, so a webhook failure propagates uncaught and aborts the request *after* the row and event have already been persisted (leaving state committed but the call failing). The `create()` dispatch at `:67` is inside the method-level try/catch but is rethrown as a generic create-failed, also rolling the caller back over a non-critical side-effect. Evidence: `modules/order_fulfillment/order_fulfillment.service.ts:67,178,186`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: wrap each `WebhookService.dispatchEvent` call in a non-blocking catch so a webhook failure does not abort the mutation; emit a fire-and-forget `AuditLog` entry for create/updateStatus/cancel.

### 🔵 Low
- **[Dimension 2 — Boundary validation] `update()` blind `Object.assign(row, dto)`** — `update()` copies the whole DTO onto the entity via `Object.assign(row, dto)` at `:131`. The DTO is Zod-typed so this is safe today, but it bypasses explicit field assignment and would silently persist any future non-column DTO field. Evidence: `modules/order_fulfillment/order_fulfillment.service.ts:131`. Rule: `validation-philosophy.md`. Fix: assign known columns explicitly (as `addTracking`/`updateStatus` already do).
- **[Dimension 9 — Caching] Unused `CACHE_TTL` constant** — `CACHE_TTL` is declared at `:23` (`env.TENANT_CACHE_TTL ?? 300`) but is never referenced anywhere in the file. `singleFlight(key, loader)` is a pure in-process dedup primitive (`modules/redis/redis.cache.ts:18`) — it takes no TTL, writes nothing to Redis, and clears its inflight entry in a `finally`, so the constant has no effect and is dead code. Evidence: `modules/order_fulfillment/order_fulfillment.service.ts:23`. Rule: `caching-patterns.md`. Fix: remove the unused constant, or introduce a real Redis read-through cache (`redis.set` with `jitter(CACHE_TTL)`) if a persistent cache is intended.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static methods, single default export, never instantiated |
| 2 | Boundary validation | ✅ | DTOs Zod-typed; outputs parsed through Safe*/WithItems/Event schemas; minor blind `Object.assign` (Low) |
| 3 | Error handling | ❌ | All throws are raw `new Error(...)`; no AppError/ErrorCode/statusCode (:76,88,129,141,163,167) |
| 4 | Messages pattern | ✅ | Uses `ORDER_FULFILLMENT_MESSAGES` const-object; no inline user-facing strings |
| 5 | DB access & ownership | ❌ | Entities under `entities/`, null-checked, no raw SQL, but multi-write `create()` lacks a transaction |
| 6 | Multi-tenancy | ✅ | All queries use `tenantDataSourceFor` and filter by `tenantId` (:87,91,95,107,128,140,162,214) |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md) |
| 8 | Service composition | ✅ | Cross-module call uses `WebhookService` facade via `@/` alias; no sub-service cross-imports/cycles |
| 9 | Caching | — | `singleFlight` used correctly as in-process dedup; no Redis read-cache to misuse; unused `CACHE_TTL` is dead code (Low) |
| 10 | Secrets & config | ✅ | TTL read from `@/modules/env`; no `process.env.X` in the service |
| 11 | Logging & audit | ⚠️ | Domain event log present; no fire-and-forget audit log; webhook dispatch (`:186`) not wrapped in a non-blocking catch |
| 12 | Security hardening | ✅ | UUID-validated inputs, enum-constrained carrier/status, no injection surface; safe terminal-status transition guard |
| 13 | Naming & organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase class, correct `.service/.dto/.types/.enums/.messages` split |

## Recommendations
1. Replace all six raw `throw new Error(...)` with `AppError` carrying explicit `statusCode` + `ErrorCode` (404 not-found, 409 invalid transition, 500 create-failed). (High)
2. Wrap `create()`'s fulfillment + items + initial event writes in `ds.transaction(...)` and dispatch the webhook only after commit. (High)
3. Wrap every `WebhookService.dispatchEvent` call (notably `:186`) in a non-blocking catch so webhook failures do not abort or roll back the mutation; add fire-and-forget audit-log entries for create/updateStatus/cancel. (Medium)
4. Confirm route/middleware enforces tenant membership + RBAC for fulfillment endpoints. (Medium)
5. Remove the dead `CACHE_TTL` constant, or wire a real Redis read-through cache if persistent caching is intended; replace the blind `Object.assign(row, dto)` in `update()` with explicit column assignment. (Low)

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `caching-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `multi-tenancy-patterns.md` · Source: `modules/order_fulfillment/order_fulfillment.service.ts`
