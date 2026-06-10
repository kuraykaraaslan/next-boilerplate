> **Uygulandı** — 2026-06-10: AppError across all 4 services (product/bundle/category/variant), redis.del fail-open, duplicateProduct transaction, addToVariantGroup + removeFromVariantGroup transactions, webhook .catch(), new VARIANT_GROUP_* message keys.

# store — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** store.product.service.ts, store.bundle.service.ts, store.category.service.ts, store.variant.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 5m / 0l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| store.product.service.ts | 271 | Product CRUD, images, spec-values, listing with spec filters, duplicate |
| store.bundle.service.ts | 138 | Bundle + bundle-item CRUD, item enrichment with product name/price |
| store.category.service.ts | 132 | Category + category-spec CRUD, upsert spec |
| store.variant.service.ts | 130 | Variant-group membership: resolve, add, update, remove |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError` throughout all four services** — Every failure path throws `new Error(STORE_MESSAGES.X)` (or an inline string) with no statusCode or ErrorCode, so a route handler cannot map it to a correct HTTP status; not-found, conflict, and internal-failure cases all surface identically. Evidence: `modules/store/store.product.service.ts:29`, `:42`, `:50`, `:71`, `:147`, `:218`; `modules/store/store.bundle.service.ts:28`, `:35`, `:43`, `:58`, `:100`, `:115`, `:133`; `modules/store/store.category.service.ts:27`, `:35`, `:43`, `:59`, `:102`; `modules/store/store.variant.service.ts:50`, `:61`, `:66`, `:105`, `:121`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(STORE_MESSAGES.X, 404, ErrorCode.NOT_FOUND)` / `409, ErrorCode.CONFLICT` / `500, ErrorCode.INTERNAL_ERROR` as appropriate.
- **[Dimension 5 — DB access / transactions] Multi-write operations not wrapped in a transaction** — `duplicateProduct` saves a cloned product, then its spec-values, then its images across three separate `save` calls; a failure after the product insert leaves a partial clone. `addToVariantGroup` creates a group, inserts the anchor item, then inserts the target item across separate saves; `removeFromVariantGroup` removes an item then conditionally deletes items + group. None use a `transaction`/`QueryRunner`. Evidence: `modules/store/store.product.service.ts:250-267`; `modules/store/store.variant.service.ts:74-90`, `:123-128`. Rule: `database-patterns.md`. Fix: wrap each multi-write flow in `ds.transaction(async (mgr) => { ... })` and use the transactional manager's repositories.

### 🟡 Medium
- **[Dimension 4 — Messages] Hardcoded inline user-facing strings in the variant service** — Several thrown messages are literal strings in the service rather than entries in `store.messages.ts`. Evidence: `modules/store/store.variant.service.ts:50` (`'A product cannot be a variant of itself.'`), `:66` (`'Target product already belongs to a variant group.'`), `:105`/`:121` (`'Variant group item not found.'`). Rule: `module-messages-pattern.md`. Fix: add `VARIANT_GROUP_SELF`, `VARIANT_GROUP_ALREADY_MEMBER`, `VARIANT_GROUP_ITEM_NOT_FOUND` to `STORE_MESSAGES` and reference them.
- **[Dimension 11 — Logging / audit] No audit trail for mutating actions** — Create/update/delete/duplicate across products, bundles, categories, specs, and variant groups produce no audit-log entry. Webhook dispatch (`product.created/updated/deleted`) is an integration event, not an audit record, and bundle/category/variant mutations emit nothing at all. Evidence: `modules/store/store.product.service.ts:144-156` (delete, no audit); `modules/store/store.bundle.service.ts:24-52`; `modules/store/store.category.service.ts:99-107`; `modules/store/store.variant.service.ts:46-129`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: add fire-and-forget `AuditLogService` calls for meaningful mutations.
- **[Dimension 3 — Error handling] `catch` re-wraps the original error but swallows its type** — In `createProduct`/`createBundle`/`createCategory`, a unique-constraint or DB error is logged then re-thrown as a generic `*_CREATE_FAILED` raw `Error`, discarding the distinction (e.g. a race-condition slug conflict becomes a generic 500-equivalent). Evidence: `modules/store/store.product.service.ts:40-43`; `modules/store/store.bundle.service.ts:33-36`; `modules/store/store.category.service.ts:33-36`. Rule: `error-handling-and-app-error.md`. Fix: throw `AppError(..., 500, ErrorCode.INTERNAL_ERROR)`, and let an already-`AppError` (the pre-check slug-taken `CONFLICT`) propagate without being re-wrapped.
- **[Dimension 9 — Caching] Cache invalidation `redis.del` not guarded for fail-open** — Reads correctly use `singleFlight`, but write paths call `await redis.del(...)` directly; a Redis outage would throw out of an otherwise-successful write path instead of failing open, breaking the mutation on a cache error. Evidence: `modules/store/store.product.service.ts:57`, `:149-150`; `modules/store/store.category.service.ts:50-51`; `modules/store/store.bundle.service.ts:50`. Rule: `caching-patterns.md`. Fix: wrap invalidation in a best-effort try/catch so cache errors don't fail the mutation.
- **[Dimension 7 — Authorization] No resource-level authz in service** — Services trust the `tenantId` argument and perform no ownership/role check; consistent with this repo's route-layer enforcement convention but a deviation from `authorization-and-rbac.md`. Evidence: every method, e.g. `modules/store/store.product.service.ts:46`, `modules/store/store.bundle.service.ts:39`. Rule: `authorization-and-rbac.md`. Fix: none required if route-layer RBAC is guaranteed; otherwise add role/feature gating in-service.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All four are static-only classes with a single default export; never instantiated. |
| 2 | Boundary validation | ✅ | Typed DTOs trusted; DB output filtered through `Store*Schema.parse` before return. |
| 3 | Error handling | ❌ | Raw `new Error(...)` everywhere; no `AppError`/statusCode/ErrorCode; create-catch re-wraps generically. |
| 4 | Messages pattern | ⚠️ | Mostly `STORE_MESSAGES`; 4 hardcoded inline strings in variant service. |
| 5 | DB access / entities / tx | ⚠️ | Entities under `entities/`, null-checked, parameterized; multi-write flows lack transactions. |
| 6 | Multi-tenancy | ✅ | All queries use `tenantDataSourceFor(tenantId)` and filter by `tenantId`, including the raw spec-filter QB. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition / imports | ✅ | Sub-services exported via `index.ts` facade; cross-module `WebhookService` via `@/` alias; no sub-service cross-imports or cycles. |
| 9 | Caching | ⚠️ | `singleFlight` reads present, but `redis.del` invalidation is not fail-open on write paths. |
| 10 | Secrets / config | ✅ | No `process.env` access; no secrets in services. |
| 11 | Logging / audit | ❌ | No audit-log entries for mutations; webhook events are not an audit trail. |
| 12 | Security hardening | ✅ | Raw SQL is fully parameterized (incl. `ANY`); slug regex-validated at DTO; no SSRF/injection vector. |
| 13 | Naming / file org | ✅ | snake_case module, kebab/dotted file suffixes, PascalCase classes, entities snake_case. |

## Recommendations
1. Replace all `throw new Error(...)` with `throw new AppError(message, statusCode, ErrorCode.X)` across the four services (NOT_FOUND→404, slug/conflict→409, *_FAILED→500). Highest priority: it is the only thing keeping the module from grade B.
2. Wrap `duplicateProduct`, `addToVariantGroup`, and `removeFromVariantGroup` multi-write flows in `ds.transaction(...)` for atomicity.
3. Move the four inline strings in `store.variant.service.ts` into `STORE_MESSAGES`.
4. Add fire-and-forget audit-log calls for create/update/delete/duplicate on products, bundles, categories, specs, and variant groups.
5. Guard `redis.del` invalidation with try/catch so cache errors fail open.

## References
- Rules: error-handling-and-app-error.md, database-patterns.md, module-messages-pattern.md, logging-monitoring-and-audit-trails.md, authorization-and-rbac.md, caching-patterns.md, multi-tenancy-patterns.md · Source: modules/store/store.product.service.ts, store.bundle.service.ts, store.category.service.ts, store.variant.service.ts
</content>
</invoke>
