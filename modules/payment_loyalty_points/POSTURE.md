# payment_loyalty_points — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_loyalty_points.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 3m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_loyalty_points.service.ts` | 376 | Loyalty account lifecycle: get/create accounts, earn/redeem/adjust points (transactional), list transactions, tier CRUD + recompute, point expiry sweep. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Service throws raw `Error` instead of `AppError`** — Five domain throws use `throw new Error(...)` so a route handler cannot derive an HTTP status (insufficient-points should be 4xx, not a generic 500). Evidence: `modules/payment_loyalty_points/payment_loyalty_points.service.ts:153` (`ACCOUNT_NOT_FOUND`), `:154` (`INSUFFICIENT_POINTS`), `:264` (`ACCOUNT_NOT_FOUND` in `recomputeTierTx`), `:292` (`TIER_CODE_EXISTS`), `:301` (`TIER_NOT_FOUND`). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw e.g. `new AppError(MESSAGES.INSUFFICIENT_POINTS, 409, ErrorCode.X)` / `404` for not-found / `409` for the duplicate-code conflict; this also removes the brittle `error.message ===` string-compare re-throw at `:178-181`.

### 🟡 Medium
- **[Dimension 9 — Caching] `bustCache` is not fail-open and runs after commit** — `bustCache` issues two un-guarded `await redis.del(...)` calls and is awaited *after* the DB transaction commits in `earn`/`redeem`/`adjust`/`recomputeTier`. A transient Redis error makes the whole mutation reject even though the points change is already durable, surfacing a false failure to the caller. Evidence: `payment_loyalty_points.service.ts:35-38`, called at `:136`, `:174`, `:225`, `:284`. Rule: `caching-patterns.md`. Fix: wrap the `redis.del` calls in try/catch and swallow (fire-and-forget / fail-open) so cache eviction never breaks a committed write.
- **[Dimension 9 — Caching] `singleFlight` provides no real read cache; `bustCache` busts keys nothing writes** — `singleFlight` (`modules/redis/redis.cache.ts:18`) is in-process inflight de-dup only; it never reads or writes Redis. So `getAccount` is not cached across requests, and `userCacheKey`/`accountCacheKey` deletions in `bustCache` evict keys that are never populated. The caching scaffold implies a negative-cache + jittered-TTL Redis read path that does not exist. Evidence: `payment_loyalty_points.service.ts:27-38`, `:61`. Rule: `caching-patterns.md`. Fix: either implement an actual Redis `get/set` (with jittered TTL + negative cache) behind `getAccount`, or drop the cache-key/bust machinery to avoid implying caching that isn't there.
- **[Dimension 11 — Logging/audit] No audit trail for balance-mutating actions** — `earn`/`redeem`/`adjust`/`expirePoints` change a user's point balance (a financial-adjacent action) but emit no fire-and-forget audit-log entry; only `Logger.error` runs on failure. Evidence: `payment_loyalty_points.service.ts:83-142` (earn), `:144-185` (redeem), `:187-231` (adjust), `:320-375` (expire). Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit an `AuditLogService` fire-and-forget event (actor, tenant, userId, delta, new balance) for each successful mutation. (Per-transaction `loyalty_transactions` rows give a domain ledger, but not an actor/admin audit trail.)

### 🔵 Low
- **[Dimension 5 — DB access] `expirePoints` re-saves a tx row by nulling `expiresAt`** — Lines `:344-345`, `:365-366` mutate a settled `EARN` ledger row's `expiresAt` to `undefined` purely as a "processed" flag, overwriting historical data on the ledger entry. Evidence: `payment_loyalty_points.service.ts:344`, `:365`. Rule: `database-patterns.md`. Fix: track processed lots with a dedicated nullable `expiredAt`/`processedAt` column rather than clearing the original expiry timestamp.
- **[Dimension 4 — Messages] One inline literal in the service** — The `EXPIRE` transaction `reason` is the hardcoded string `'Points expired'` instead of a `MESSAGES` entry. Evidence: `payment_loyalty_points.service.ts:358`. Rule: `module-messages-pattern.md`. Fix: add `POINTS_EXPIRED_REASON` to `payment_loyalty_points.messages.ts` and reference it. (Minor: this is a stored ledger reason, not a thrown user-facing error.)

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class` of only static methods; never instantiated. |
| 2 | Boundary validation | ✅ | Typed DTOs in; every DB row returned through `Loyalty*Schema.parse` (output filtered). |
| 3 | Error handling | ❌ | 5 `throw new Error(...)` instead of `AppError` (`:153,154,264,292,301`); fragile message-string re-throw at `:178`. |
| 4 | Messages pattern | ⚠️ | Uses `PAYMENT_LOYALTY_POINTS_MESSAGES`, but one inline literal `'Points expired'` at `:358`. |
| 5 | DB access & ownership | ⚠️ | DB only in service, entities under `entities/`, null-checked, transactions used; but `expirePoints` overwrites `expiresAt` on settled rows (`:344,365`). |
| 6 | Multi-tenancy | ✅ | All queries use `tenantDataSourceFor(tenantId)` and filter by `tenantId` (`:47,64,91,152,195,245,263,266,291,300,309,330,337`). |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource/role check; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). No cross-tenant risk — all queries are tenantId-scoped. |
| 8 | Service composition & boundaries | ✅ | No sub-service cross-imports/cycles; cross-module imports (`@/modules/db`, `@/modules/redis`, `@/modules/logger`) use the `@/` alias. |
| 9 | Caching | ⚠️ | `singleFlight` is in-process only (no Redis read/negative cache/jitter); `bustCache` busts unwritten keys and is not fail-open after commit (`:35-38`). |
| 10 | Secrets & config | ✅ | No `process.env` reads in the service; no secrets handled. |
| 11 | Logging & audit | ⚠️ | Failure-path `Logger.error` only; no fire-and-forget audit log for balance mutations. No secret leakage. |
| 12 | Security hardening | ✅ | UUID-validated DTO input, no SSRF/injection surface, balance floored at 0 (`:208`), negative `points` rejected by DTO for earn/redeem. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/snake files, PascalCase class, correct `.service/.dto/.types/.enums/.messages` suffixes. |

## Recommendations
1. **(High)** Replace all five `throw new Error(...)` with `AppError(message, statusCode, ErrorCode.X)` — 404 for not-found, 409 for `INSUFFICIENT_POINTS`/`TIER_CODE_EXISTS` — and delete the message-string re-throw guard at `:178-181`.
2. **(Medium)** Make `bustCache` fail-open: try/catch each `redis.del` so a Redis blip never rejects an already-committed points mutation.
3. **(Medium)** Either implement a real Redis read cache (get/set + jittered TTL + negative cache) behind `getAccount`, or remove the misleading cache-key/`bustCache` scaffold.
4. **(Medium)** Add fire-and-forget audit-log entries (actor, tenant, userId, delta, resulting balance) for `earn`/`redeem`/`adjust`/`expirePoints`.
5. **(Low)** Use a dedicated `processedAt` column for expiry sweeps instead of nulling `expiresAt`; move the `'Points expired'` literal into the messages file.
6. **(Note)** Dimension 7 is a route-layer deviation (resource-level check not in service), not a severity-bearing finding here since every query is tenantId-scoped.

## References
- Rules: `error-handling-and-app-error.md`, `caching-patterns.md`, `logging-monitoring-and-audit-trails.md`, `authorization-and-rbac.md`, `database-patterns.md`, `module-messages-pattern.md`, `multi-tenancy-patterns.md` · Source: `modules/payment_loyalty_points/payment_loyalty_points.service.ts`
