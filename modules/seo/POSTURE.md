# seo — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** seo.service.ts
> **Overall grade:** B · **Findings:** 0c / 0h / 2m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| seo.service.ts | 55 | Upsert / get / delete per-entity SEO metadata for a tenant, keyed by (tenantId, entityType, entityId), with a Redis cache-invalidation wrapper. |

## Findings

### 🟡 Medium

- **[Dimension 9 — Caching] `get()` never populates Redis; the cache is write-only-delete.** `singleFlight` only dedupes concurrent in-process loaders (`modules/redis/redis.cache.ts:18-30`); it does not read from or write to Redis. So `get()` always hits the DB, while `upsert`/`delete` call `redis.del(cacheKey(...))` on keys that are never set. SEO metadata is an obviously hot read path (rendered on every public page). Evidence: `modules/seo/seo.service.ts:37-43` (loader with no `redis.get`/`redis.set`), `:28`, `:53` (`redis.del` on never-written keys). Rule: `caching-patterns.md`. Fix: in the `singleFlight` loader, `await redis.get` first (negative-cache misses), and on DB hit `await redis.set(..., jitter(ttl))`; or drop the `redis.del` calls if no read-through cache is intended.

- **[Dimension 3 — Error handling] No AppError surface; `save`/`delete`/`findOne` failures propagate raw.** The service contains no `try/catch` and throws no `AppError`. A TypeORM failure (e.g. unique-constraint race on `upsert`, or a `parse` failure on a malformed DB row) surfaces as a raw driver/Zod error with no `statusCode`/`ErrorCode`, so a route handler cannot derive an HTTP status. No raw `throw new Error(...)` exists, so this is a gap rather than a hard violation. Evidence: `modules/seo/seo.service.ts:27-29`, `:52`. Rule: `error-handling-and-app-error.md`. Fix: wrap the `upsert` save in a `try/catch` and throw `new AppError(SEO_MESSAGES.UPSERT_FAILED, 409, ErrorCode.X)` on conflict/failure.

### 🔵 Low

- **[Dimension 2 — Boundary validation] Service signature types `entityType`/`entityId` as bare `string`.** The route DTO `SeoRouteParamsDTO` (`seo.dto.ts:19-22`) validates `entityType` against `SeoEntityTypeEnum` and `entityId` as a UUID, but the service params are `string`, so the service does not carry the narrowed types. Output is correctly filtered through `SeoMetaSchema.parse` (`seo.service.ts:29,42`). Evidence: `modules/seo/seo.service.ts:13-17,32-35,46-49`. Rule: `validation-philosophy.md`. Fix: type params as `SeoEntityType` / branded UUID to keep the boundary contract visible in the service.

- **[Dimension 11 — Logging/Audit] Mutations (`upsert`, `delete`) are not audit-logged.** No audit trail for SEO metadata changes. Low sensitivity, but `delete` is a destructive operation. Evidence: `modules/seo/seo.service.ts:27,52`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit-log entry on upsert/delete if SEO changes are considered meaningful tenant actions.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | `class SeoService` with only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Output filtered via `SeoMetaSchema.parse`; service params typed as bare `string` (route validates via DTO). |
| 3 | Error handling | ⚠️ | No raw `throw new Error`; but no `AppError` either — DB/parse failures propagate without statusCode/ErrorCode. |
| 4 | Messages pattern | ✅ | No hardcoded inline user-facing strings in the service; `seo.messages.ts` source exists. |
| 5 | DB access & entity ownership | ✅ | Repo access only in service; entity under `entities/`; null-checked after `findOne`; no raw SQL; single-write ops (no tx needed). |
| 6 | Multi-tenancy | ✅ | Uses `tenantDataSourceFor(tenantId)`; every query filters by `tenantId`. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | No sub-services; cross-module imports use `@/` alias (`@/modules/db`, `@/modules/redis`). No cycles. |
| 9 | Caching | 🟡 | Hot read path: `get()` never reads/writes Redis (`singleFlight` is in-process only); `redis.del` targets never-written keys. |
| 10 | Secrets & config | ✅ | No `process.env.X` reads in service. |
| 11 | Logging & audit | ⚠️ | No audit log on `upsert`/`delete`. No secret leakage. |
| 12 | Security hardening | ✅ | Input length-capped in DTO; URL fields `z.string().url()`; no SSRF/injection surface in service; no crypto. |
| 13 | Naming & file organization | ✅ | snake_case module `seo`, kebab/dot-suffixed files, PascalCase `SeoService`, correct `.service/.dto/.types/.enums/.messages` suffixes. |

## Recommendations
1. Make caching real or remove it: in `get()`'s `singleFlight` loader, read-through from `redis.get` and write the hit back with `redis.set(..., jitter(ttl))` (and negative-cache misses), so the existing `redis.del` invalidations have meaning. Otherwise drop the `redis.del` calls.
2. Add an `AppError` surface: wrap the `upsert` save in `try/catch` and throw `new AppError(SEO_MESSAGES.UPSERT_FAILED, 409, ErrorCode.X)` on unique-constraint conflict.
3. Tighten the service signature to `SeoEntityType` for `entityType` and a UUID-typed `entityId` so the validated boundary contract is explicit.
4. Optionally fire-and-forget audit logging on `upsert`/`delete`.

## References
- Rules: `caching-patterns.md`, `error-handling-and-app-error.md`, `validation-philosophy.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md` · Source: `modules/seo/seo.service.ts`
