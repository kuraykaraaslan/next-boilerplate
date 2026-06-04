# payment_shipping — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_shipping.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_shipping.service.ts` | 272 | CRUD for shipping methods and rates plus the cart shipping-quote calculation engine (`calculateShipping`), with rate-range validation and method/rate cache invalidation. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Service throws raw `Error` instead of `AppError`** — Every failure path throws `new Error(PAYMENT_SHIPPING_MESSAGES.X)`, so a route handler cannot derive an HTTP status (404 vs 409 vs 422 vs 500 all collapse to a generic 500). Evidence: `modules/payment_shipping/payment_shipping.service.ts:35,48,53,68,99,115,131,148,227,266,269`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(msg, 404|409|422, ErrorCode.X)` — e.g. `METHOD_NOT_FOUND`/`RATE_NOT_FOUND` → 404 NotFound, `METHOD_CODE_TAKEN` → 409 Conflict, `INVALID_*_RANGE` → 422.

### 🟡 Medium
- **[Dimension 9 — Caching] Hot read paths have no real cache; cache scaffolding is inert** — `CACHE_TTL` (line 18) is declared but never used, and there are no `redis.get`/`redis.set` calls anywhere. `getMethod` wraps its load in `singleFlight`, which only dedupes concurrent in-process callers (see `modules/redis/redis.cache.ts:18`) and never persists, while `calculateShipping` — the core, per-checkout hot path — issues two full active-row table scans on every call with no caching at all. The `redis.del(methodKey(...))` invalidation calls (lines 58,101,123,140,151) therefore delete keys that are never written. Evidence: `modules/payment_shipping/payment_shipping.service.ts:18,58,63,176-187`. Rule: `caching-patterns.md`. Fix: either implement a real `redis.get`/`set` (with `jitter(CACHE_TTL)` TTL, fail-open) behind `methodKey`/a quote key, or remove the dead `CACHE_TTL` and no-op `redis.del` calls to avoid implying a cache that does not exist.
- **[Dimension 3 — Error handling] `calculateShipping` masks the real error and re-wraps as raw `Error`** — The whole body is wrapped in `try/catch` that logs and rethrows `new Error(CALCULATION_FAILED)`. Beyond the raw-Error issue, this swallows the underlying cause (DB connectivity, a Zod parse failure) into an opaque 500, and would also mask any future `AppError` thrown inside the block. Evidence: `modules/payment_shipping/payment_shipping.service.ts:225-228`. Rule: `error-handling-and-app-error.md`. Fix: log and rethrow as `AppError(... , 500, ErrorCode.Internal)`, and re-throw `AppError` instances unchanged rather than collapsing them.
- **[Dimension 5 — DB access] Check-then-write guards are non-atomic** — `createMethod` reads code uniqueness then saves, and `createRate` reads parent-method existence then saves, as separate awaits with no transaction. No single multi-row write needs a transaction today, but the duplicate-code check at line 34 is racy under concurrency. Evidence: `modules/payment_shipping/payment_shipping.service.ts:34-38,112-124`. Rule: `database-patterns.md`. Fix: rely on a DB unique constraint on `(tenantId, code)` for methods (treat the app-level `findOne` check as a friendly pre-check) and/or wrap genuine multi-write sequences in `ds.transaction(...)`.
- **[Dimension 7 — Authorization] No in-service resource-level authz; trusts caller `tenantId`** — Service performs no ownership/role check and trusts the `tenantId` argument. Per grounding facts this is the repo norm, but the 00 rule says resource-level checks belong in the service. Tenant isolation itself is correctly enforced — every query filters by `tenantId`. Evidence: `modules/payment_shipping/payment_shipping.service.ts:29,77,176`. Rule: `authorization-and-rbac.md`. Note: authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md).

### 🔵 Low
- **[Dimension 11 — Logging/audit] No audit trail for mutating operations** — Create/update/delete of methods and rates affect tenant checkout pricing but emit no audit-log entry; only `calculateShipping` logs (on error). Evidence: `modules/payment_shipping/payment_shipping.service.ts:29-152`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit-log entry on method/rate create/update/delete.
- **[Dimension 2 — Boundary validation] `Object.assign(row, dto)` mass-assigns the update DTO onto the entity** — `updateMethod`/`updateRate` spread the whole DTO onto the loaded row. The DTOs are Zod-validated and contain no id/tenantId fields, so this is currently safe, but mass-assign is fragile if the DTO schema later gains a sensitive field. Evidence: `modules/payment_shipping/payment_shipping.service.ts:56,138`. Rule: `validation-philosophy.md`. Fix: assign only the explicitly allowed columns, or keep the DTO strictly free of identity/tenant fields.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | DTOs typed; output run through `Safe*`/`*Schema.parse`. `Object.assign(row, dto)` mass-assign (Low). |
| 3 | Error handling | ❌ | All throws are raw `Error`, not `AppError`; `calculateShipping` masks cause (High). |
| 4 | Messages pattern | ✅ | All user-facing strings sourced from `payment_shipping.messages.ts`; none inline. |
| 5 | DB access & entity ownership | ⚠️ | DB only in service, entities under `entities/`, null-checked after `findOne`, no raw SQL; check-then-write not atomic, no txn helper used. |
| 6 | Multi-tenancy | ✅ | Uses `tenantDataSourceFor(tenantId)`; every method/rate query filters by `tenantId`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource check; trusts caller (route-layer enforcement; deviation noted). |
| 8 | Service composition & boundaries | ✅ | No sub-services/cycles; cross-module imports use `@/` alias (db, redis, logger, env). |
| 9 | Caching | ⚠️ | Hot path `calculateShipping` uncached; `CACHE_TTL` dead, `redis.del` invalidates keys never written (Medium). |
| 10 | Secrets & config | ✅ | Config via `@/modules/env`; no `process.env.X` in service. |
| 11 | Logging & audit | ⚠️ | Error logging present; no fire-and-forget audit log for mutations (Low). |
| 12 | Security hardening | ✅ | Validated numeric inputs, range guards, no SSRF/injection surface, safe generic error messages. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase class, entities in `entities/`. |

## Recommendations
1. Replace every `throw new Error(...)` with `throw new AppError(message, statusCode, ErrorCode.X)` mapping not-found→404, code-taken→409, invalid-range→422, calculation→500; re-throw existing `AppError`s unchanged in `calculateShipping`.
2. Decide on caching: implement a real `redis.get`/`set` (jittered TTL, fail-open) for `getMethod` and the `calculateShipping` quote path, or delete the inert `CACHE_TTL` and the no-op `redis.del` invalidations to remove the false impression of a cache.
3. Add a DB unique constraint on `(tenantId, code)` for shipping methods and treat the app-level duplicate check as a friendly pre-check, not the integrity guarantee.
4. Add fire-and-forget audit-log entries for method/rate create/update/delete.
5. Replace `Object.assign(row, dto)` with explicit column assignment to keep mass-assign safe as DTOs evolve.

## References
- Rules: `error-handling-and-app-error.md`, `caching-patterns.md`, `database-patterns.md`, `authorization-and-rbac.md`, `validation-philosophy.md`, `logging-monitoring-and-audit-trails.md`, `multi-tenancy-patterns.md` · Source: `modules/payment_shipping/payment_shipping.service.ts`, `payment_shipping.types.ts`, `payment_shipping.dto.ts`, `payment_shipping.messages.ts`, `entities/shipping_method.entity.ts`, `entities/shipping_rate.entity.ts`
