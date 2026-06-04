# payment_wishlist — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_wishlist.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_wishlist.service.ts` | 205 | Wishlist CRUD (create/getById/getByShareToken/update/list/delete, getOrCreateDefault) and item operations (addItem/removeItem/moveItem/clear) over the tenant DataSource. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Service throws raw `Error` instead of `AppError`** — Every failure path throws `new Error(PAYMENT_WISHLIST_MESSAGES.X)`, so a route handler cannot derive an HTTP status or `ErrorCode`. Not-found cases (`WISHLIST_NOT_FOUND`, `WISHLIST_ITEM_NOT_FOUND`) should be 404, `WISHLIST_NOT_PUBLIC` 403, create/add failures 500. Evidence: `modules/payment_wishlist/payment_wishlist.service.ts:31,69,82,83,91,120,133,155,167,182,186,199`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(PAYMENT_WISHLIST_MESSAGES.WISHLIST_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` etc. with appropriate status/code per case.

### 🟡 Medium
- **[Dimension 9 — Caching] Redis cache never read or written; only in-process dedup** — `getById` wraps `buildWithItems` in `singleFlight` (process-local concurrent dedup only), and `update`/`delete`/`addItem`/`removeItem`/`moveItem`/`clear` call `redis.del(cacheKey(...))`, but no code path ever does `redis.get`/`redis.set` on that key. The cache is invalidated but never populated, so every `getById` is a full two-query DB read with no TTL and no negative cache; the `redis.del` calls are effectively dead. This is a hot read path (default wishlist / shared wishlist views) with no real cache. Evidence: `modules/payment_wishlist/payment_wishlist.service.ts:20-22,74-77,97,122,159,169,190-191,202`. Rule: `caching-patterns.md`. Fix: either implement a real cache (`redis.get` → on miss `singleFlight` load → `redis.set` with `jitter(ttl)`, fail-open on Redis errors) or remove the cacheKey/`redis.del` scaffolding so the intent is honest.
- **[Dimension 11 — Logging and audit] Mutations are not audit-logged** — `create`, `update`, `delete`, `addItem`, `removeItem`, `moveItem`, and `clear` mutate tenant data with no audit-trail entry; only failure paths in `create`/`addItem` emit `Logger.error`. Evidence: `modules/payment_wishlist/payment_wishlist.service.ts:53,87,116,129,163,173,195`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit-log entry (actor `userId`, tenant, action, target id) on each successful mutation.

### 🔵 Low
- **[Dimension 5 — DB access] Check-then-write paths not wrapped in a transaction** — `getOrCreateDefault` (findOne + conditional save) and `addItem` (find + conditional create) perform read-then-write without a transaction or unique constraint; under concurrency they can produce a duplicate Default wishlist or a duplicate item that the existence check intends to prevent. Low because the impact is a harmless duplicate, not corruption. Evidence: `modules/payment_wishlist/payment_wishlist.service.ts:43-51,129-157`. Rule: `database-patterns.md`. Fix: rely on a DB unique constraint (`tenantId,userId,name` / `tenantId,wishlistId,productId,variantId`) or wrap the check-then-write in a transaction.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class`, all-static methods, never instantiated. |
| 2 | Boundary validation | ✅ | Typed DTOs consumed; DB output filtered through `SafeWishlistSchema` / `WishlistWithItemsSchema`; no ad-hoc validation. |
| 3 | Error handling | ❌ | All throws are raw `new Error(...)`; should be `AppError` with statusCode + ErrorCode. |
| 4 | Messages pattern | ✅ | Uses `PAYMENT_WISHLIST_MESSAGES` const-object; no inline user-facing strings. |
| 5 | DB access and entity ownership | ⚠️ | DB only in service, entities under `entities/`, null-checked after `findOne`, no raw SQL; check-then-write paths lack a transaction/unique constraint. |
| 6 | Multi-tenancy | ✅ | All queries use `tenantDataSourceFor(tenantId)` and filter by `tenantId` (incl. item, list, delete, clear). |
| 7 | Authorization / RBAC | ⚠️ | Authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). `getByShareToken` does enforce `isPublic`. |
| 8 | Service composition and boundaries | ✅ | No sub-services; imports via `@/` alias (`@/modules/db`, `@/modules/redis`, `@/modules/logger`); no cycles. |
| 9 | Caching | ⚠️ | Cache key/invalidation scaffolding exists but Redis is never read/written; hot read path effectively uncached. |
| 10 | Secrets and config | ✅ | No `process.env` reads; no secrets handled in service. |
| 11 | Logging and audit | ⚠️ | Successful mutations are not audit-logged (Medium). |
| 12 | Security hardening | ✅ | `shareToken` via `randomUUID()`; UUID DTO validation upstream; no injection/SSRF surface; safe messages. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/snake files, PascalCase class, correct `.service/.dto/.types/.enums/.messages` suffixes. |

## Recommendations
1. Replace every `throw new Error(PAYMENT_WISHLIST_MESSAGES.X)` with `AppError` carrying the right statusCode + ErrorCode (404 not-found, 403 not-public, 500 create/add-failed).
2. Make caching honest: implement `redis.get`/`redis.set` with `jitter()` TTL and fail-open inside `getById`/`getByShareToken`, or remove the unused `cacheKey`/`redis.del` scaffolding.
3. Add fire-and-forget audit-log entries on `create`/`update`/`delete`/`addItem`/`removeItem`/`moveItem`/`clear`.
4. Add DB unique constraints (or transactions) for the Default-wishlist and per-product item check-then-write paths.

## References
- Rules: `error-handling-and-app-error.md`, `caching-patterns.md`, `logging-monitoring-and-audit-trails.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md` · Source: `modules/payment_wishlist/payment_wishlist.service.ts`
</content>
</invoke>
