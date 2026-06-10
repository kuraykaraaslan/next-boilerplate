# payment_cart — Posture Review

> **Uygulandı:** 2026-06-11 — High: AppError on all 14 throw sites (404/409/422); Medium: mergeGuestIntoUser wrapped in transaction, IsNull() for nullable FK lookups, audit entries for coupon apply/remove/merge/convert; Low: duplicate redis.del removed.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_cart.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_cart.service.ts` | 355 | Cart lifecycle (get-or-create, by-id), item add/update/remove/clear, coupon apply/remove with delegated validation, guest→user merge, conversion marking, totals recalculation, and listing. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — Every failure path throws `new Error(PAYMENT_CART_MESSAGES.X)` (14 sites) rather than `new AppError(message, statusCode, ErrorCode.X)`. A route handler cannot derive an HTTP status (404 for not-found vs 409 for not-active vs 422 for invalid coupon) from a raw `Error`; all become 500. Evidence: `modules/payment_cart/payment_cart.service.ts:66,104,131,159,160,196,213,225,241,252,266,288,318,329`. Rule: `error-handling-and-app-error.md`. Fix: import `{ AppError, ErrorCode }` from `@/modules/common/app-error` and map each throw (e.g. `CART_NOT_FOUND` → `404 ErrorCode.NOT_FOUND`, `CART_NOT_ACTIVE` → `409 ErrorCode.CONFLICT`, `COUPON_INVALID` → `422 ErrorCode.VALIDATION_ERROR`).

### 🟡 Medium
- **[Dimension 7 — Authorization / RBAC] No in-service resource-level ownership check** — Methods trust the `tenantId` (and `cartId`/`userId`/`guestToken`) passed by the caller; there is no check that the acting user owns the cart they mutate. Evidence: `modules/payment_cart/payment_cart.service.ts:153,191,208,236` (item/coupon mutations keyed only on `tenantId`+`cartId`). Per grounding facts this is WARN — authz is enforced at the route layer; the resource-level (cart-ownership) check is not in the service (deviation from `authorization-and-rbac.md`). Fix: optionally pass and assert the acting `userId`/`guestToken` against `cart.userId`/`cart.guestToken` so one tenant member cannot mutate another member's cart.
- **[Dimension 5 — DB access / transactions] Multi-write operations not wrapped in a transaction** — `mergeGuestIntoUser` performs many item moves/merges plus a guest-cart status flip across separate `save`/`remove` calls; a mid-loop failure leaves items partially migrated and the guest cart still `ACTIVE`. `addItem`/`recalcAndSave` and `applyCoupon`/`recalcAndSave` are likewise two-phase. Evidence: `modules/payment_cart/payment_cart.service.ts:292-321` (merge loop), `188`, `258`. Rule: `database-patterns.md`. Fix: wrap merge (and the save-then-recalc pairs) in `ds.transaction(...)` so the operation is atomic.
- **[Dimension 5 — DB access] `findOne` filter relies on `?? undefined` for nullable match keys** — In `addItem` and `mergeGuestIntoUser` the existing-line lookup passes `productId: dto.productId ?? undefined` / `variantId: ... ?? undefined`; TypeORM drops `undefined` keys from the `where`, so a line with no productId/variantId may match an unrelated line (or fail to dedupe) rather than matching on `IS NULL`. Evidence: `modules/payment_cart/payment_cart.service.ts:162-171,295-303`. Rule: `database-patterns.md`. Fix: use `IsNull()` for the null branch (e.g. `productId: dto.productId ?? IsNull()`), then the redundant post-`findOne` equality re-check at `:171`/`:303` can be removed.
- **[Dimension 11 — Logging / audit] No audit log on mutating cart actions** — Cart/coupon/merge/convert mutations are not audit-logged; only `Logger.warn`/`Logger.error` fire on failures. `markConverted` (commerce-relevant state transition) and `mergeGuestIntoUser` in particular warrant a fire-and-forget audit entry. Evidence: `modules/payment_cart/payment_cart.service.ts:324-334,279-322` (no audit call). Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget `AuditLogService` entry for convert/merge/coupon-apply.

### 🔵 Low
- **[Dimension 9 — Caching] Stale-window after coupon mutation** — `applyCoupon`/`removeCoupon` invalidate `pay:cart:${cartId}`, then call `recalcAndSave` which deletes the same key again; harmless but redundant, and `recalcAndSave` itself does not run under `singleFlight`, so concurrent writers can each recompute. Evidence: `modules/payment_cart/payment_cart.service.ts:256,270,89`. Rule: `caching-patterns.md`. Fix: drop the duplicate `redis.del` (recalc already invalidates) and consider serializing recalc per cart.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `default class` with only static methods; never instantiated. |
| 2 | Boundary validation | ✅ | Service trusts typed DTOs; DB rows re-parsed through `CartItemSchema`/`SafeCartSchema`/`CartWithItemsSchema` before return. |
| 3 | Error handling | ❌ | 14 `throw new Error(...)`; zero `AppError` — no statusCode/ErrorCode. Coupon-validation failure correctly fails open (`:54-57`). |
| 4 | Messages pattern | ✅ | All strings from `PAYMENT_CART_MESSAGES`; no inline user-facing literals. |
| 5 | DB access & ownership | ⚠️ | Entities under `entities/`, null-checked, no raw SQL; but multi-write ops lack transactions and `?? undefined` match keys are fragile. |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters by `tenantId` (carts and cart_items are tenant entities). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | `CouponService` imported via `@/modules/coupon` facade; no sub-service cross-imports or cycles. |
| 9 | Caching | ⚠️ | Read path uses `singleFlight` + correct invalidation and fail-open; minor redundant `del` and non-serialized recalc. |
| 10 | Secrets & config | ✅ | TTL via `@/modules/env`; no `process.env.X` in the service. |
| 11 | Logging & audit | ⚠️ | Failure logs present and leak no secrets, but no audit trail on convert/merge/coupon mutations. |
| 12 | Security hardening | ✅ | Discount clamped to subtotal (`:30-31`), totals re-derived server-side; no SSRF/injection surface. |
| 13 | Naming & file org | ✅ | snake_case module, kebab/`.service.ts` suffixes, PascalCase class, entities in `entities/`. |

## Recommendations
1. **(High)** Replace all 14 `throw new Error(...)` with `throw new AppError(message, statusCode, ErrorCode.X)` mapped to correct HTTP statuses.
2. **(Medium)** Wrap `mergeGuestIntoUser` and the save-then-recalc mutation pairs in `ds.transaction(...)` for atomicity.
3. **(Medium)** Use `IsNull()` for nullable match keys in dedupe lookups and remove the redundant post-lookup equality checks.
4. **(Medium)** Add fire-and-forget audit entries for `markConverted`, `mergeGuestIntoUser`, and coupon apply/remove.
5. **(Low)** Optionally assert acting `userId`/`guestToken` against the cart inside the service for defense-in-depth; drop the duplicate `redis.del` in coupon paths.

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `caching-patterns.md`, `multi-tenancy-patterns.md` · Source: `modules/payment_cart/payment_cart.service.ts`
