# redis — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `redis.service.ts` (plus infra siblings `redis.bullmq.ts`, `redis.cache.ts` for context)
> **Overall grade:** B · **Findings:** 0c / 0h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `redis.service.ts` | 17 | Shared `ioredis` client singleton + `createRedisConnection()` factory for Pub/Sub + exported `redisConnectionOptions`. |
| `redis.bullmq.ts` | 16 | `getBullMQConnection()` options builder + `createQueue<T>()` factory (context only). |
| `redis.cache.ts` | 30 | Cache primitives `jitter(ttl)` and in-process `singleFlight(key, loader)` (context only). |

## Findings

### 🟡 Medium
- **[Dimension 1 — Static service class] Module is not a static service class** — `redis.service.ts` exports a default singleton instance, a const options object, and a factory function rather than a `class` with static methods and a single default export. Evidence: `modules/redis/redis.service.ts:4,11,14,16`. Rule: `code-structure-ts-master.md`. Fix: acceptable for a pure connection-factory infrastructure module (no business logic to host on a class); note it as a deliberate deviation, or expose helpers under a `RedisService` static facade if strict standardization is desired.
- **[Dimension 3 — Error handling] No `error` listener on the client; unhandled-error crash risk** — the client is constructed at module load (`redis.service.ts:11`) with no `.on('error', …)` handler, and `createRedisConnection()` instances (`redis.service.ts:14`) likewise attach none. An ioredis `error` event with no listener surfaces as an unhandled error and can crash the process; connection failures are also never wrapped in `AppError` for callers. Evidence: `modules/redis/redis.service.ts:11,14`. Rule: `error-handling-and-app-error.md`. Fix: attach a logged, fail-open `error` listener to the singleton and to factory instances so connection errors are surfaced/logged rather than thrown unhandled.
- **[Dimension 11 — Logging and audit] No connection lifecycle logging** — there is no `connect` / `ready` / `error` / `reconnecting` logging on the shared client, making Redis outages invisible in logs. No secrets are leaked (good), but the absence of any signal is a gap for an infrastructure dependency. Evidence: `modules/redis/redis.service.ts:11`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: log connection lifecycle events via the logger module (never logging `REDIS_PASSWORD`).

### 🔵 Low
- **[Dimension 12 — Defensive] Password coercion differs between client and BullMQ** — the singleton coerces a missing password to `''` (`redis.service.ts:7`) while BullMQ coerces it to `undefined` (`redis.bullmq.ts:8`). Harmless today but an easy source of confusion about whether an unset password means empty-string auth or no auth. Evidence: `modules/redis/redis.service.ts:7`. Rule: `secrets-and-configuration-security.md`. Fix: align both paths to `undefined` so an unset password means "no auth" identically.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | Connection factory of exported consts/functions, not a static class; acceptable for infra but a convention deviation. |
| 2 | Boundary validation | — | No external/user input; only Zod-validated `env` consumed. |
| 3 | Error handling | ⚠️ | No `error` handler on the client; failures not wrapped in `AppError`. |
| 4 | Messages pattern | — | No user-facing strings; no messages file needed. |
| 5 | DB access / entities | — | No DB, no entities, no SQL — infrastructure only. |
| 6 | Multi-tenancy | — | Intentionally tenant-agnostic shared global client (confirmed in README Tenant Variability). |
| 7 | Authorization / RBAC | — | No resource access; nothing to authorize at this layer. |
| 8 | Service composition / boundaries | ✅ | Depends only on `@/modules/env`; clean re-export via `index.ts`; no cycles. |
| 9 | Caching | ✅ | Provides `jitter` (TTL spread) + `singleFlight` (dedup); README pattern fails open via `.catch(() => null)`. |
| 10 | Secrets and config | ✅ | All config via `@/modules/env` (Zod-validated); zero `process.env` reads. |
| 11 | Logging and audit | ⚠️ | No connection lifecycle logging; no secret leakage. |
| 12 | Security hardening | ✅ | Password from env only; not logged; `maxRetriesPerRequest: null` intentional for BullMQ. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab-case files, descriptive suffixes, single `index.ts` re-export. |

## Recommendations
1. Attach a logged, fail-open `error` (and `reconnecting`/`ready`) listener to the shared client and to `createRedisConnection()` instances so Redis outages are visible and don't surface as unhandled process-level errors. (Medium — Dimensions 3 + 11)
2. Standardize missing-password coercion to `undefined` across `redis.service.ts` and `redis.bullmq.ts`. (Low — Dimension 12)
3. Optionally wrap the factory in a `RedisService` static facade for strict alignment with the static-service convention; otherwise document this module as an explicit infra exception. (Medium — Dimension 1)

## References
- Rules: `code-structure-ts-master.md`, `error-handling-and-app-error.md`, `logging-monitoring-and-audit-trails.md`, `caching-patterns.md`, `env-and-config.md`, `secrets-and-configuration-security.md`, `naming-conventions.md` · Source: `modules/redis/redis.service.ts`, `modules/redis/redis.bullmq.ts`, `modules/redis/redis.cache.ts`, `modules/redis/index.ts`
</content>
</invoke>
