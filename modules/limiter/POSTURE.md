> **Uygulandı** — 2026-06-10: Wrapped all Redis calls (incr/expire in limiter.service.ts; pipeline exec in limiter.tenant-plan.service.ts) in try/catch fail-open (returns {success:true} on Redis error); added Logger.warn on rate-limit hits and Redis errors; replaced Math.random() member suffix with randomUUID() for guaranteed uniqueness.

# limiter — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `limiter.service.ts`, `limiter.tenant-plan.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 3m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `limiter.service.ts` | 29 | Fixed-window IP rate limiter via `redis.incr` for `auth`/`api` scopes; exports `check`, `LIMITS`, `RATE_LIMIT_WINDOW`. |
| `limiter.tenant-plan.service.ts` | 57 | Sliding-window sorted-set limiter (`checkSlidingWindowRateLimit`) plus per-tenant (`checkTenantPlanRateLimit`) and per-webhook (`checkWebhookRateLimit`) wrappers; `-1` = unlimited. |

## Findings

### 🟡 Medium
- **[Dimension 1 — Static service class] Module exports loose functions, not a static class** — Neither file defines a `class` with static methods and a single `export default`; both export standalone async functions. `module.json` advertises `LimiterService` / `TenantPlanLimiterService` exports that do not exist as classes. Evidence: `limiter.service.ts:12`, `limiter.tenant-plan.service.ts:16`. Rule: `code-structure-ts-master.md`. Fix: wrap exports in `class LimiterService { static check(...) }` with `export default`, or document this thin-infra module as an intentional exception and align `module.json`.
- **[Dimension 9 — Caching] Sliding-window limiter does not fail open on a Redis error** — `pipe.exec()` (and `redis.incr`/`redis.expire` in the sibling) will reject if Redis is unavailable; the limiter then throws an unhandled raw Redis error into the request path instead of failing open (allowing the request) or closed (a typed 503/429). Evidence: `limiter.tenant-plan.service.ts:33`, `limiter.service.ts:19`. Rule: `caching-patterns.md`. Fix: wrap the Redis calls in try/catch and return a documented degraded result (typically fail-open: `{ success: true }`) on infrastructure error.
- **[Dimension 3 — Error handling] Redis infrastructure failures surface as raw errors** — Because no Redis call is guarded, a connection/pipeline failure propagates as a raw `Error` with no `statusCode`/`ErrorCode`, so a route handler cannot derive an HTTP status. Evidence: `limiter.service.ts:19-21`, `limiter.tenant-plan.service.ts:33`. Rule: `error-handling-and-app-error.md`. Fix: catch and either fail open or rethrow as `new AppError(message, 503, ErrorCode.X)`.

### 🔵 Low
- **[Dimension 11 — Logging and audit] No telemetry on limiter degradation or block** — Rate-limit blocks and (especially) Redis failures are not logged, so a silently failing limiter is invisible in production. Evidence: `limiter.tenant-plan.service.ts:33-41`, `limiter.service.ts:24-28`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: add a fire-and-forget `logger.warn` on Redis error / block (without leaking IP secrets). Audit-log not required for a counter.
- **[Dimension 12 — Security hardening] Sliding-window member uses `Math.random()`** — The sorted-set member `${now}:${Math.random()...}` only needs uniqueness, not unpredictability, so this is acceptable; noted only because a sub-millisecond collision under high concurrency could under-count by one. Evidence: `limiter.tenant-plan.service.ts:26`. Rule: `security-hardening.md`. Fix: optional — append a process counter or `crypto.randomUUID()` for guaranteed uniqueness.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ❌ | Loose exported functions, no static class / default export; `module.json` claims `*Service` exports. |
| 2 | Boundary validation | — | Inputs are trusted primitives from internal callers; no DB output, so no Safe*Schema needed. |
| 3 | Error handling | ⚠️ | No explicit throws, but unguarded Redis calls can surface raw errors with no `ErrorCode`/status. |
| 4 | Messages pattern | — | No user-facing strings produced; module returns result objects only. |
| 5 | DB access / entity ownership | — | No DB, no entities, no SQL — pure Redis. |
| 6 | Multi-tenancy | ✅ | `checkTenantPlanRateLimit` keys `tenant:{tenantId}:ratelimit` — isolated per tenant; no tenant DB query. |
| 7 | Authorization / RBAC | — | Stateless infra primitive; authz is the caller's concern. Numeric limit is passed in, not resolved here. |
| 8 | Service composition | ✅ | Uses `@/modules/redis` facade; tenant-plan service reuses `checkSlidingWindowRateLimit`; no cycles. |
| 9 | Caching | ⚠️ | This IS the Redis path but does not fail open on a Redis error (no try/catch around `exec`/`incr`). |
| 10 | Secrets / config | ✅ | No `process.env` reads; Redis client comes from `@/modules/redis`. |
| 11 | Logging / audit | ⚠️ | No log on block or Redis degradation; limiter can fail silently. |
| 12 | Security hardening | ⚠️ | `Math.random()` member id is fine for uniqueness; minor collision edge case only. |
| 13 | Naming / file organization | ✅ | `limiter.service.ts` / `limiter.tenant-plan.service.ts` follow kebab-case + `.service.ts` suffix. |

## Recommendations
1. Wrap every Redis call in try/catch and adopt an explicit fail-open (recommended for rate limiting) or fail-closed-with-`AppError(503)` policy — this resolves both the Dimension 9 and Dimension 3 findings.
2. Add fire-and-forget `logger.warn` on Redis errors and on rate-limit blocks so degradation is observable.
3. Either refactor to the static-class + `export default` convention or formally document this as a thin-infrastructure exception and correct `module.json`'s `*Service` export claims.
4. (Optional) Replace `Math.random()` member suffix with `crypto.randomUUID()` for guaranteed uniqueness under concurrency.

## References
- Rules: `code-structure-ts-master.md`, `caching-patterns.md`, `error-handling-and-app-error.md`, `logging-monitoring-and-audit-trails.md`, `security-hardening.md`, `multi-tenancy-patterns.md` · Source: `modules/limiter/limiter.service.ts`, `modules/limiter/limiter.tenant-plan.service.ts`
