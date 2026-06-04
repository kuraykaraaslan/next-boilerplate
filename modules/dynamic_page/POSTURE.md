# dynamic_page — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** dynamic_page.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| dynamic_page.service.ts | 264 | CRUD for tenant dynamic pages, page translations, and reusable block definitions; slug/blocks Redis read caching; deletes the page's seo_meta row on page removal. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error` instead of `AppError`** — Every error path throws a raw `Error(DynamicPageMessages.X)` with no `statusCode`/`ErrorCode`, so a route handler cannot derive an HTTP status (404 vs 409 vs 403 vs 500). "Not found" (404), "slug/type taken" (409 conflict), and "system block protected" (403) all collapse to an opaque 500. Evidence: `modules/dynamic_page/dynamic_page.service.ts:71,85,97,106,115,120,131,139,175,183,209,218,227,240,250,259`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(msg, 404, ErrorCode.NOT_FOUND)`, `new AppError(msg, 409, ErrorCode.CONFLICT)`, `new AppError(msg, 403, ErrorCode.FORBIDDEN)`, and `new AppError(msg, 500, ErrorCode.INTERNAL_ERROR)` for the persistence-failure cases respectively.

### 🟡 Medium
- **[Dimension 9 — Caching] Cache reads do not fail open** — `getPageBySlug` and `listBlocks` call `redis.get`/`redis.setex` inside `singleFlight` with no try/catch, so a Redis outage turns a cacheable read into a hard failure instead of degrading to the DB. There is also no negative cache for the not-found path (line 85 throws before any sentinel is stored). Evidence: `modules/dynamic_page/dynamic_page.service.ts:77-89,191-203`. Rule: `caching-patterns.md`. Fix: wrap the `redis.get`/`setex` calls so a cache error logs and falls through to the DB query; optionally add a short negative-cache sentinel for missing slugs.
- **[Dimension 5 — DB access] Page delete + SEO delete not transactional** — `deletePage` calls `repo.remove(row)` then `SeoService.delete(...)`; the SEO call is awaited but not wrapped in a transaction and not caught. If `SeoService.delete` throws, the page row is already gone, leaving an orphaned `seo_meta` row and surfacing a raw error to the caller. Evidence: `modules/dynamic_page/dynamic_page.service.ts:140-142`. Rule: `database-patterns.md`. Fix: either treat the SEO cleanup as a fire-and-forget side-effect with a `try/catch` + `Logger`, or sequence the SEO delete before the page removal / inside a coordinating transaction.
- **[Dimension 11 — Logging and audit] No audit log on mutations** — Create/update/delete of pages, translations, and blocks (including deletion of system-protected blocks) produce no audit-trail entry; only failure paths hit `Logger.error`. These are meaningful admin actions on tenant content. Evidence: `modules/dynamic_page/dynamic_page.service.ts:92-143,156-185,213-262`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit-log entry (actor, tenantId, action, target id) on each create/update/delete.
- **[Dimension 7 — Authorization / RBAC] No in-service resource ownership/role check** — The service trusts the `tenantId` argument and performs no resource-level role/ownership verification; authz is enforced at the route layer. Per the repo convention this is a WARN, not a failure. Evidence: `modules/dynamic_page/dynamic_page.service.ts:33-34,92,110,135`. Rule: `authorization-and-rbac.md`. Note: authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md).

### 🔵 Low
- **[Dimension 5 — DB access] `Object.assign(row, dto)` blind-merges the DTO onto the entity** — `updatePage` and `updateBlock` spread the whole partial DTO onto the loaded row. It is currently safe because `UpdatePageDTO`/`UpdateBlockDTO` are `.partial()` of the Create DTOs and carry no `tenantId`/id field, but a future DTO field rename could silently overwrite an immutable column. Evidence: `modules/dynamic_page/dynamic_page.service.ts:123,243`. Rule: `database-patterns.md`. Fix: assign an explicit allow-list of mutable fields rather than the entire DTO.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default-exported class, all static methods, never instantiated. |
| 2 | Boundary validation | ✅ | Typed DTO input; every DB row re-parsed through a `*RecordSchema` Safe schema before return. |
| 3 | Error handling | ❌ | All 16 throw sites use raw `new Error`; no `AppError`/`statusCode`/`ErrorCode`. |
| 4 | Messages pattern | ✅ | All user-facing strings sourced from `dynamic_page.messages.ts` const-object; none inline. |
| 5 | DB access / entity ownership | ⚠️ | Null-checked findOne, entities in `entities/`, no raw SQL; but page+SEO delete not transactional and blind `Object.assign`. |
| 6 | Multi-tenancy | ✅ | Always `tenantDataSourceFor(tenantId)`; every query filters by `tenantId`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource check; enforced at route layer (deviation from authorization-and-rbac.md). |
| 8 | Service composition / boundaries | ✅ | Cross-module call uses the `@/modules/seo/seo.service` facade via `@/` alias; no sub-service cycles. |
| 9 | Caching | ⚠️ | singleFlight + jittered TTL present, but cache reads don't fail open and no negative cache. |
| 10 | Secrets and config | ✅ | No `process.env` reads; no secrets handled in the service. |
| 11 | Logging and audit | ⚠️ | `Logger.error` on failures only; no audit-trail entries for mutations. |
| 12 | Security hardening | ✅ | Slug/type validated by regex at DTO; ILIKE search uses parameterized binding; no injection/SSRF surface. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase class, entities suffixed `.entity.ts`. |

## Recommendations
1. Replace all 16 raw `throw new Error(...)` with `AppError` carrying the correct `statusCode` + `ErrorCode` (404 not-found, 409 conflict, 403 system-block, 500 persistence failure). This is the only thing keeping the module out of grade B.
2. Make Redis reads fail open in `getPageBySlug` and `listBlocks` (try/catch around `redis.get`/`setex`, fall through to DB), and consider a negative cache for missing slugs.
3. Treat the `SeoService.delete` cleanup in `deletePage` as a caught fire-and-forget side-effect (or coordinate both writes in a transaction) to avoid orphaned `seo_meta` rows.
4. Add fire-and-forget audit-log entries on page/translation/block create/update/delete, especially the system-block deletion path.
5. Replace `Object.assign(row, dto)` with an explicit mutable-field assignment in `updatePage`/`updateBlock`.

## References
- Rules: error-handling-and-app-error.md, caching-patterns.md, database-patterns.md, logging-monitoring-and-audit-trails.md, authorization-and-rbac.md, multi-tenancy-patterns.md, zod-validation.md · Source: modules/dynamic_page/dynamic_page.service.ts
