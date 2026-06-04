# media_gallery — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** media_gallery.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| media_gallery.service.ts | 155 | CRUD for per-entity media galleries: get-or-create gallery, list items (with UploadedFile url/mimeType resolved), add/update/remove items, reorder, primary-flag management, Redis key invalidation. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — Three not-found paths throw `new Error(MEDIA_GALLERY_MESSAGES.X)` with no statusCode/ErrorCode, so a route handler cannot derive an HTTP status (404 collapses to 500). Evidence: `modules/media_gallery/media_gallery.service.ts:90`, `:110`, `:127`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(MEDIA_GALLERY_MESSAGES.ITEM_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` (import from `@/modules/common/app-error`).
- **[Dimension 5 — DB access] Multi-write operations not wrapped in a transaction** — `addItem` does a primary-reset `update` then an item `save` as two separate statements (`:95`,`:97`); `updateItem` does primary-reset `update` then `save` (`:112`,`:115`); `reorder` issues N independent `update`s via `Promise.all` (`:139-143`). A partial failure leaves the gallery with zero or two primaries, or a half-applied ordering. Evidence: `modules/media_gallery/media_gallery.service.ts:94-97`, `:111-115`, `:139-143`. Rule: `database-patterns.md`. Fix: wrap each multi-write in `ds.transaction(async (m) => …)` using the manager's repositories.

### 🟡 Medium
- **[Dimension 9 — Caching] Cache is invalidated but never populated; invalidation is a no-op** — `listItems` wraps the read in `singleFlight(cacheKey(...))`, but `singleFlight` is an in-process dedup primitive only — it never reads/writes Redis (`modules/redis/redis.cache.ts:18`). No `redis.get`/`redis.set` exists in the service, so every call hits the DB, yet `addItem`/`removeItem`/`_invalidate`/`reorder` all `redis.del(cacheKey(...))` a key that is never set. The hot read path (`listItems`) is effectively uncached and the invalidation does no useful work. Evidence: `modules/media_gallery/media_gallery.service.ts:59-78`, `:98`, `:147-154`. Rule: `caching-patterns.md`. Fix: either add a real Redis get/set + jittered-TTL + negative-cache + fail-open around the loader, or drop `singleFlight`/`redis.del` and document the read as uncached.
- **[Dimension 7 — Authorization] No resource-level ownership/role check in service** — Service trusts the `tenantId` argument and performs no membership/role/feature gate; e.g. anyone able to reach `addItem` with a valid `tenantId` + `entityId` can attach media to any entity in that tenant. authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Evidence: `modules/media_gallery/media_gallery.service.ts:80-100`. Rule: `authorization-and-rbac.md`. Fix: confirm route/middleware enforces tenant membership + RBAC; optionally validate that `entityId` belongs to `tenantId`.
- **[Dimension 5 — DB access] No referential validation that `entityId` exists** — `getOrCreate` will happily create a `media_galleries` row for any `entityType`/`entityId` pair without checking the target store_product/category/etc. exists, allowing orphan galleries. Evidence: `modules/media_gallery/media_gallery.service.ts:47-50`. Rule: `database-patterns.md`. Fix: validate the referenced entity exists (or rely on a documented upstream guarantee) before creating the gallery.
- **[Dimension 11 — Logging and audit] No audit logging on mutations** — `addItem`, `updateItem`, `removeItem`, `reorder` mutate tenant data with zero fire-and-forget audit trail. Evidence: `modules/media_gallery/media_gallery.service.ts:80-145`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit fire-and-forget audit events for add/update/remove/reorder (media-attachment changes are meaningful tenant actions).

### 🔵 Low
- **[Dimension 13 — Naming] Helper method named `_invalidate` with leading underscore** — Private static is correctly `private`, but the `_`-prefix is redundant given the TS `private` keyword and is inconsistent with the rest of the codebase's naming. Evidence: `modules/media_gallery/media_gallery.service.ts:147`. Rule: `naming-conventions.md`. Fix: rename to `invalidate` (still `private static`).

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static methods, single `default export`, never instantiated. |
| 2 | Boundary validation | ✅ | DTOs are Zod schemas (trusted as typed input); all reads parsed through `MediaGalleryItemViewSchema`/`MediaGallerySchema`/`*WithItemsSchema`. Output IS Safe-schema'd. |
| 3 | Error handling | ❌ | Raw `throw new Error(...)` at `:90`, `:110`, `:127` — no statusCode/ErrorCode. |
| 4 | Messages pattern | ✅ | Uses `MEDIA_GALLERY_MESSAGES` const-object from `media_gallery.messages.ts`; no inline user-facing strings. |
| 5 | DB access & entity ownership | ⚠️ | DB only in service, entities under `entities/`, null-checked after `findOne`, no raw SQL; but no transactions on multi-write ops and no `entityId` referential check. |
| 6 | Multi-tenancy | ✅ | Always `tenantDataSourceFor(tenantId)`; every query filters by `tenantId` (gallery, item, UploadedFile, update, delete, reorder). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Single service, no sub-services; cross-module `UploadedFile`/`db`/`redis` imports use `@/` alias and entity-only import. |
| 9 | Caching | ⚠️ | `singleFlight` is in-process dedup only — no Redis get/set; read path uncached yet `redis.del` invalidates a never-set key (no-op invalidation). |
| 10 | Secrets & config | ✅ | No `process.env` reads; no secrets handled in service. |
| 11 | Logging & audit | ⚠️ | No audit logging on add/update/remove/reorder mutations. |
| 12 | Security hardening | ✅ | UUID-validated inputs via DTOs; tenant-scoped queries; no SSRF/injection surface; safe (non-leaking) error messages. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/snake files, PascalCase class, correct `.service/.dto/.types/.messages` suffixes. (`_invalidate` underscore is a Low style nit.) |

## Recommendations
1. **Replace all `throw new Error(...)` with `AppError(msg, 404, ErrorCode.NOT_FOUND)`** at lines 90, 110, 127 so routes return correct HTTP status. (High)
2. **Wrap multi-write operations in `ds.transaction(...)`** — `addItem`, `updateItem` (primary-reset + save) and `reorder` (N updates) — to keep the single-primary and ordering invariants atomic. (High)
3. **Fix the caching story:** either implement a real Redis get/set with jittered TTL + negative cache + fail-open around `listItems`, or remove `singleFlight`/`redis.del` and treat the read as uncached. Current code pays invalidation cost for zero cache benefit. (Medium)
4. **Add fire-and-forget audit logging** for add/update/remove/reorder. (Medium)
5. **Validate the referenced `entityId` exists** (or document the upstream guarantee) before `getOrCreate` writes a gallery row, to prevent orphan galleries. (Medium)
6. **Rename `_invalidate` → `invalidate`** (still `private static`). (Low)

## References
- Rules: `error-handling-and-app-error.md`, `caching-patterns.md`, `database-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `naming-conventions.md`, `multi-tenancy-patterns.md` · Source: `modules/media_gallery/media_gallery.service.ts`, `media_gallery.dto.ts`, `media_gallery.types.ts`, `media_gallery.messages.ts`, `entities/media_gallery.entity.ts`, `entities/media_gallery_item.entity.ts`
</content>
</invoke>
