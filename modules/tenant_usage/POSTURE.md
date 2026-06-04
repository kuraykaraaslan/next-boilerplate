# tenant_usage — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `tenant_usage.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `tenant_usage.service.ts` | 175 | Per-tenant monthly usage metering: Redis O(1) increment counters (apiCalls, aiTokens, storageBytes, emailSends, smsSends), Redis-first read with DB fallback (`getUsage`), and Redis→DB flush/upsert (`flushToDb`). |

## Findings

### 🟡 Medium
- **[Dimension 9 — Caching] Read/flush Redis calls do not fail open; raw ioredis error propagates** — The private `_increment` helper correctly wraps Redis in try/catch and logs+returns 0 on failure (best-effort), but `getUsage` calls `redis.mget(...)` (line 99) and `flushToDb` calls `redis.mget(...)` (line 135) with no try/catch. The default `redis` export is a raw ioredis instance (`modules/redis/redis.service.ts:11,16`), so a transient Redis fault rejects and surfaces to the caller as a raw, status-less error rather than failing open to the DB fallback (in `getUsage`) or being logged-and-skipped (in `flushToDb`). Evidence: `modules/tenant_usage/tenant_usage.service.ts:99`, `:135`. Rule: `caching-patterns.md`. Fix: wrap the `mget` in `getUsage` in try/catch and fall through to the DB branch on error; in `flushToDb` catch the Redis read and skip that tenant (the cron worker already log-and-continues per-tenant at `tenant_usage.job.ts:38-44`, but the raw error class remains opaque).
- **[Dimension 3 — Error handling] No AppError; propagated errors are raw and status-less** — The service never throws an `AppError`. It also never throws a raw `new Error(...)` (good — confirmed: no `throw` statements in the service), but the unguarded `redis.mget` (lines 99, 135) and the unguarded `tenantDataSourceFor`/`repo.findOne`/`repo.save` (lines 115-117, 154-173) can reject with raw infrastructure errors. A route handler calling `getUsage` cannot derive an HTTP status. Evidence: `modules/tenant_usage/tenant_usage.service.ts:115`, `:173`. Rule: `error-handling-and-app-error.md`. Fix: catch infrastructure failures and rethrow as `new AppError(Messages.X, 500, ErrorCode.X)` from `@/modules/common/app-error`, or fail open as above.
- **[Dimension 2 — Boundary validation] DB/Redis output not passed through a Safe*Schema** — `getUsage` returns raw entity fields (`row.apiCalls`, `Number(row.aiTokens)`, …) and `parseInt`-ed Redis strings directly to callers (lines 104-129) with no `SafeTenantUsageSchema` filter. The module has no `.dto.ts` / Safe schema file. Evidence: `modules/tenant_usage/tenant_usage.service.ts:104-129`. Rule: `validation-philosophy.md`. Fix: add a `tenant_usage.dto.ts` `SafeTenantUsageSchema` and parse the returned shape before handing it to a route.
- **[Dimension 4 — Messages] No module messages source** — There are no user-facing strings emitted today (no throws), so nothing is hardcoded into a response, but the module has no `tenant_usage.messages.ts`; if error handling is added per the Dimension 3 finding it must source messages from a messages file rather than inline. Evidence: module dir has no `*.messages.ts`. Rule: `module-messages-pattern.md`. Fix: create `tenant_usage.messages.ts` ahead of adding AppError throws.

### 🔵 Low
- **[Dimension 1 — Static service class] Named export, not single default export** — `export class TenantUsageService` (line 23) is a named export; most peer services use `export default class` (`modules/storage/storage.service.ts:21`, `modules/ai/ai.service.ts:38`). The class is correctly all-static and never instantiated. Evidence: `modules/tenant_usage/tenant_usage.service.ts:23`. Rule: `code-structure-ts-master.md`. Fix: change to `export default class TenantUsageService` for consistency with the predominant single-default-export convention (note: `redis_idempotency.service.ts` also uses a named export, so this is a minor/style point).
- **[Dimension 11 — Logging/audit] Increment failures logged but no audit trail; acceptable for metering** — `_increment` logs a warn on Redis failure (lines 56-60) and the metric name is non-sensitive; no secret leakage. Usage metering is high-frequency best-effort, so fire-and-forget audit logging is intentionally absent. Evidence: `modules/tenant_usage/tenant_usage.service.ts:56`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: none required; noted for completeness.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | All-static, never instantiated, but named export not `export default` (most peers use default). |
| 2 | Boundary validation | ⚠️ | No Safe*Schema on DB/Redis output; returns raw fields. No external input to validate (internal callers pass typed args). |
| 3 | Error handling | ⚠️ | No raw `throw new Error`, but no AppError either; raw infra errors can propagate status-less. |
| 4 | Messages pattern | ⚠️ | No `*.messages.ts`; currently no user-facing strings emitted. |
| 5 | DB access and entity ownership | ✅ | DB touched only here; `TenantUsage` under module `entities/`; null-checked after `findOne` (lines 119, 157); no raw SQL. Single upsert write — no multi-write txn needed. |
| 6 | Multi-tenancy | ✅ | `tenantDataSourceFor(tenantId)` used (lines 115, 154); every query filters `where: { tenantId, month }` (lines 117, 156). Redis keys namespaced by tenantId. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource-level check; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition / boundaries | ✅ | No sub-service cross-imports; cross-module deps (`@/modules/redis`, `@/modules/db`, `@/modules/logger`) use facades and `@/` alias. |
| 9 | Caching | ⚠️ | `_increment` fails open correctly, but `getUsage`/`flushToDb` Redis reads are not fail-open and propagate raw ioredis errors. |
| 10 | Secrets and config | ✅ | No `process.env` reads; no secrets handled. TTL is a module const, not config. |
| 11 | Logging and audit | ⚠️ | Increment failure warn-logged, no secret leakage; no audit trail (acceptable for metering). |
| 12 | Security hardening | ✅ | No injection/SSRF surface; `parseInt`/`Number` coercion on untrusted Redis strings; no crypto. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/snake files, PascalCase class, correct `.service.ts`/`.entity.ts`/`.job.ts` suffixes. |

## Recommendations
1. **(Medium)** Make `getUsage` fail open: wrap the `redis.mget` (line 99) in try/catch and fall through to the DB-fallback branch on any Redis error, matching the best-effort posture of `_increment`.
2. **(Medium)** Wrap the `flushToDb` Redis read and the DB write paths so failures rethrow as `AppError(..., 500, ErrorCode.X)` (sourced from a new `tenant_usage.messages.ts`) instead of raw infrastructure errors; the cron worker already log-and-continues per tenant.
3. **(Medium)** Add `tenant_usage.dto.ts` with a `SafeTenantUsageSchema` and parse the `getUsage` return shape before exposing it to a route.
4. **(Low)** Switch `export class` → `export default class TenantUsageService` to align with the predominant single-default-export convention used by peer services.

## References
- Rules: `caching-patterns.md`, `error-handling-and-app-error.md`, `validation-philosophy.md`, `module-messages-pattern.md`, `code-structure-ts-master.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md` · Source: `modules/tenant_usage/tenant_usage.service.ts` (context: `entities/tenant_usage.entity.ts`, `tenant_usage.job.ts`, `README.md`)
</content>
</invoke>
