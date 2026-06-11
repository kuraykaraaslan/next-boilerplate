# payment_return_rma — Posture Review

> **Uygulandı:** 2026-06-11 — High: AppError on all throw sites (404/409/400/502); Medium: create() wrapped in transaction, outer catch no longer flattens AppErrors, dead Redis cache fully removed (CACHE_TTL+cacheKey+redis.del+singleFlight), audit entries for approve/reject/refund.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_return_rma.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 5m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_return_rma.service.ts` | 272 | RMA / return-request lifecycle: create, read/list, update, status transitions (approve/reject/markReceived/refund/complete/cancel), event log; delegates actual refunds to `PaymentSellService`. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — Every error path throws `new Error(Messages.X)` with no `statusCode` / `ErrorCode`, so a route handler cannot derive an HTTP status (404 for not-found, 409 for invalid transition, 400 for bad amount, 502 for refund/create failure all collapse to a generic 500). Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:79`, `:91`, `:133`, `:178`, `:194`, `:250`, `:252`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(msg, 404, ErrorCode.NOT_FOUND)` for not-found, `409 / ErrorCode.CONFLICT` for `INVALID_STATUS_TRANSITION`, `400 / ErrorCode.VALIDATION` for `INVALID_REFUND_AMOUNT`, `502 / ErrorCode.*` for `REFUND_FAILED` / `RETURN_CREATE_FAILED`.

### 🟡 Medium
- **[Dimension 9 — Caching] Incoherent cache: `singleFlight` never populates Redis, yet mutations invalidate a non-existent entry and do not fail open** — `getById` wraps the load in `singleFlight` (`:88`), but `singleFlight` is only an in-process promise dedupe — it never reads or writes Redis (`modules/redis/redis.cache.ts:18`). Consequently `CACHE_TTL` (`:24`) is dead, and every mutation calls `redis.del(cacheKey(...))` (`:137`, `:151`, `:160`, `:170`, `:203`, `:212`, `:222`) against a key that is never set. Those `redis.del` calls are also not wrapped in try/catch, so a Redis outage throws and fails the mutation (no fail-open). Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:24`, `:88`, `:137`. Rule: `caching-patterns.md`. Fix: either remove the dead `CACHE_TTL` const and the `redis.del` calls (treat the path as uncached), or implement a real read-through cache (`redis.get` → `singleFlight` loader → `redis.set` with `jitter(CACHE_TTL)`) and guard `redis.del` so cache errors fail open.
- **[Dimension 5 — DB access / transactions] Multi-write `create` is not transactional** — `create` saves the request (`:58`), then the items (`:72`), then logs an event (`:74`) in three separate writes with no transaction. A failure after the request is saved leaves an orphaned request with no items. Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:58-74`. Rule: `database-patterns.md`. Fix: wrap the request+items+event writes in `ds.transaction(async (mgr) => { ... })` and use the transactional manager's repositories.
- **[Dimension 3 / 5 — Error handling] Outer `try/catch` in `create` masks the real error and flattens `AppError` semantics** — the broad `catch` at `:77` rethrows a generic `RETURN_CREATE_FAILED` for any failure, including a not-found surfaced by the nested `getById` (`:76`) or any downstream error, collapsing status/error codes. Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:77-80`. Rule: `error-handling-and-app-error.md`, `database-patterns.md`. Fix: narrow the catch to the persistence step, or rethrow `AppError` instances unchanged and only wrap genuinely unexpected errors.
- **[Dimension 7 — Authorization] No resource-level ownership/role check in service** — the service trusts the `tenantId` argument and performs no actor/role or ownership validation (e.g. a customer cancelling only their own RMA, admin-only `approve`/`reject`/`refund`). authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:145,155,174`. Rule: `authorization-and-rbac.md`. Fix: if customer-initiated flows exist, pass and verify the acting `userId` against `row.userId` for self-service actions; gate moderation/refund to admin roles.
- **[Dimension 11 — Logging / audit] No central audit-log for privileged refund / moderation actions** — status changes are recorded in the domain `return_events` table (good for history), but money-moving / privileged actions (`refund`, `approve`, `reject`) are not emitted to the platform audit-log trail. Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:174-205` (no AuditLog call). Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit-log entry for `refund`/`approve`/`reject` capturing actor, returnRequestId, and amount (no secrets).

### 🔵 Low
- **[Dimension 2 — Validation] `update` uses `Object.assign(row, dto)` for partial update** — `Object.assign` (`:135`) copies whatever keys the typed `UpdateReturnDTO` carries onto the entity; it is constrained by the DTO type but bypasses an explicit field allow-list at the persistence boundary. Evidence: `modules/payment_return_rma/payment_return_rma.service.ts:135`. Rule: `validation-philosophy.md`. Fix: assign the known writable fields explicitly to make intent and the writable surface obvious.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default export, all-static, never instantiated. |
| 2 | Boundary validation | ✅ | Typed DTOs in, outputs parsed via `SafeReturnRequestSchema` / `ReturnRequestWithItemsSchema` / `ReturnEventSchema`; minor `Object.assign` note (Low). |
| 3 | Error handling | ❌ | All throws are raw `new Error(...)`; no `AppError`/`ErrorCode`/status (`:79,91,133,178,194,250,252`); outer `create` catch flattens errors. |
| 4 | Messages pattern | ✅ | All user-facing strings from `payment_return_rma.messages.ts`; no inline strings. |
| 5 | DB access & entity ownership | ⚠️ | Entities under `entities/`, null-checked, no raw SQL; but multi-write `create` is non-transactional. |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters by `tenantId`. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Cross-module refund via `PaymentSellService` facade through `@/modules/payment_sell`; no sub-service cross-imports. |
| 9 | Caching | ⚠️ | `singleFlight` is in-process only — no real Redis cache; `CACHE_TTL` dead; `redis.del` invalidates a key never set and does not fail open. |
| 10 | Secrets & config | ✅ | Uses `@/modules/env`; no `process.env.X` in the service. |
| 11 | Logging & audit | ⚠️ | Domain `return_events` audit trail present; privileged refund/moderation not sent to central audit-log. |
| 12 | Security hardening | ✅ | Negative `refundAmount` rejected (`:177`); refund failure surfaced; no SSRF/injection surface; RMA number via `randomUUID` (`:43`). |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase class, correct `.service.ts` / `.entity.ts` suffixes. |

## Recommendations
1. **Replace all raw `throw new Error(...)` with `AppError`** carrying explicit `statusCode` + `ErrorCode` (404 not-found, 409 invalid transition, 400 bad amount, 502 refund/create failure), and stop flattening nested `AppError`s in the `create` catch — restores correct HTTP semantics for callers.
2. **Make `create` transactional** (`ds.transaction`) so request + items + event commit atomically.
3. **Resolve the caching incoherence**: either remove `CACHE_TTL` and the `redis.del` calls (path is effectively uncached), or implement a true read-through Redis cache with `redis.get`/`redis.set` + `jitter(CACHE_TTL)`, and guard `redis.del` to fail open.
4. **Add central audit-log entries** (fire-and-forget) for `refund`, `approve`, `reject` capturing actor, returnRequestId, and amount.
5. **Add resource-level authz** for self-service flows (verify acting user against `row.userId`) and role-gate moderation/refund if those actions are customer-reachable.

## References
- Rules: `error-handling-and-app-error.md`, `caching-patterns.md`, `database-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `multi-tenancy-patterns.md`, `validation-philosophy.md` · Source: `modules/payment_return_rma/payment_return_rma.service.ts`
