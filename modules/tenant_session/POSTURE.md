> **Uygulandı** — 2026-06-10: All 9 raw Error throws → AppError (404 TENANT_NOT_FOUND, 403 TENANT_SUSPENDED/FORBIDDEN, 403 NOT_TENANT_MEMBER); redis.get/setex wrapped in try/catch (fail-open); deletedAt: IsNull() added to sessionVersion recheck; miss-path wrapped in singleFlight with jitter TTL; sentinel comparison by message-string → instanceof AppError check.

# tenant_session — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `tenant_session.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `tenant_session.service.ts` | 120 | Resolves a tenant + the requesting user's membership from the per-tenant DB, validates tenant/member status, enforces the required role against a fixed `OWNER>ADMIN>USER` hierarchy, and caches the resolved session in Redis with `sessionVersion` staleness detection. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Service throws raw `Error` instead of `AppError`** — All control-flow throws use `new Error(TenantAuthMessages.X)`, so a route handler cannot derive an HTTP status (401/403/404) from the failure; everything collapses to 500. This is the authentication/authorization primitive for every tenant route, making the impact broad. Evidence: `tenant_session.service.ts:37`, `:38`, `:42`, `:43`, `:44`, `:68`, `:80`, `:84`, `:88`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw e.g. `new AppError(TenantAuthMessages.TENANT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)`, `...INSUFFICIENT_TENANT_PERMISSIONS, 403, ErrorCode.FORBIDDEN`, status `INACTIVE/SUSPENDED/PENDING` → 403, `USER_NOT_MEMBER_OF_TENANT` → 403/404.

### 🟡 Medium
- **[Dimension 9 — Caching] Cache read does not fail open** — `redis.get`/`setex` are unguarded (`:53`, `:91`); a Redis outage propagates an exception out of `authenticateTenantMembership`, hard-failing authentication for an entire route surface instead of degrading to a direct DB resolve. Caching is meant to be best-effort. Evidence: `tenant_session.service.ts:53`. Rule: `caching-patterns.md`. Fix: wrap the `redis.get` (and the `setex`) in try/catch that logs and falls through to the DB path on cache-layer errors (fail open).
- **[Dimension 6 — Multi-tenancy] Cache-hit `sessionVersion` recheck omits the `deletedAt` filter** — On the cache-hit fast path the live recheck query filters only `{ tenantId, userId }` and not `deletedAt: IsNull()` (unlike the authoritative `getTenantMembership` at `:32`). A member soft-deleted *without* a `sessionVersion` bump would still match the cached version and keep authenticating until TTL expiry. Tenant isolation itself is intact (query is `tenantId`-scoped), so this is correctness/revocation, not cross-tenant. Evidence: `tenant_session.service.ts:62`. Rule: `multi-tenancy-patterns.md`. Fix: add `deletedAt: IsNull()` to the recheck `where`, or treat a null result as stale and evict.
- **[Dimension 9 — Caching] No single-flight / jitter on the hot auth read path** — `authenticateTenantMembership` is invoked on effectively every tenant request; on a cold/evicted key, concurrent requests for the same `(userId, tenantId)` each run a full multi-datasource resolve (no `singleFlight`, no jittered TTL), risking a thundering herd. Evidence: `tenant_session.service.ts:79`. Rule: `caching-patterns.md`. Fix: wrap the miss-path resolve in `singleFlight` and add TTL jitter (helpers already exist in `@/modules/redis`).

### 🔵 Low
- **[Dimension 3 — Error handling] Sentinel comparison by message string** — The cache `catch` distinguishes an authz failure from a JSON/cache error by string-equality on `e.message` (`:74`). Brittle if the message text changes. Evidence: `tenant_session.service.ts:74`. Rule: `error-handling-and-app-error.md`. Fix: once migrated to `AppError`, branch on `ErrorCode`/`instanceof AppError` instead of message text.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class, all-static methods, single default export, never instantiated. |
| 2 | Boundary validation | ✅ | Typed inputs trusted; all DB output parsed through `SafeTenantSchema` / `SafeTenantMemberSchema` before return. |
| 3 | Error handling | ❌ | All throws are raw `new Error(...)`; never `AppError` (`:37`–`:88`). Message-string sentinel at `:74`. |
| 4 | Messages pattern | ✅ | All user-facing strings from `tenant_session.messages.ts` (`TenantAuthMessages`); no inline literals. |
| 5 | DB access & entity ownership | ✅ | DB only in service; entities imported from owning modules; null-checked after `findOne`; no raw SQL; reads only (no multi-write txn needed). |
| 6 | Multi-tenancy | ⚠️ | Tenant/member reads use `tenantDataSourceFor` and filter `tenantId`; `getUserTenants` correctly enumerates from `getDataSource()`. Recheck query at `:62` drops `deletedAt` (revocation gap, not isolation). |
| 7 | Authorization / RBAC | ✅ | This *is* the resource-level authz primitive: enforces tenant status, member status, and role hierarchy in-service. |
| 8 | Service composition & boundaries | ✅ | Cross-module imports via `@/` alias to owning modules' entities/types; no sub-service cycles. |
| 9 | Caching | ⚠️ | Caches with `sessionVersion` staleness check, but does not fail open (`:53`) and lacks single-flight/jitter on a hot path (`:79`). |
| 10 | Secrets & config | ✅ | TTL via `@/modules/env` (`env.TENANT_CACHE_TTL`, `:14`); no `process.env` access. |
| 11 | Logging & audit | — | Pure authz resolver; no mutating action that warrants an audit-log entry. |
| 12 | Security hardening | ✅ | No SSRF/injection surface; safe message strings; role check re-applied on cache hit (`:67`). |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dotted file suffixes, PascalCase `TenantSessionService`. |

## Recommendations
1. **(High)** Migrate every `new Error(TenantAuthMessages.X)` to `new AppError(message, statusCode, ErrorCode.X)` with correct HTTP statuses (404 not-found, 403 forbidden/insufficient-role, 403 for inactive/suspended/pending). Then replace the message-string sentinel at `:74` with an `instanceof AppError` / `ErrorCode` check.
2. **(Medium)** Make the cache layer fail open: wrap `redis.get`/`setex` in try/catch and fall through to the DB resolve on any Redis error.
3. **(Medium)** Add `deletedAt: IsNull()` to the `sessionVersion` recheck `where` at `:62` so soft-deleted members are not re-authenticated from cache.
4. **(Medium)** Wrap the cache-miss resolve in `singleFlight` and add TTL jitter to protect this hot per-request path.

## References
- Rules: `error-handling-and-app-error.md`, `caching-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `code-structure-ts-master.md`, `zod-validation.md`, `env-and-config.md` · Source: `modules/tenant_session/tenant_session.service.ts`, `tenant_session.messages.ts`, `tenant_session.setting.keys.ts`, `README.md`
