# product_review — Posture Review

> **Uygulandı:** 2026-06-10 — High AppError (6 throw site, 404 NOT_FOUND), Medium voteHelpful transaction, Medium redis.del cache busts fail-open, Medium redundant rating validation kaldırıldı.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** product_review.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| product_review.service.ts | 226 | Product review CRUD, moderation, helpful-votes, product rating summary aggregation, soft delete; tenant-scoped, Redis-cached reads |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — Every throw in the service uses `throw new Error(PRODUCT_REVIEW_MESSAGES.X)`, so a route handler cannot derive an HTTP status or `ErrorCode`. Not-found cases should be 404 and invalid-rating should be 400, but both surface as opaque 500s. The module never imports `AppError`/`ErrorCode`. Evidence: `modules/product_review/product_review.service.ts:37,68,101,107,129,153,176,220`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and replace each throw, e.g. `throw new AppError(PRODUCT_REVIEW_MESSAGES.REVIEW_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` and `throw new AppError(PRODUCT_REVIEW_MESSAGES.INVALID_RATING, 400, ErrorCode.VALIDATION)`.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Ad-hoc `if/else` rating validation duplicates the DTO** — `create`/`update` re-validate `rating` with manual `Number.isInteger / < 1 / > 5` checks, but `CreateReviewDTO` and `UpdateReviewDTO` already enforce `z.number().int().min(1).max(5)` at the route boundary. The service should trust its typed input. Evidence: `modules/product_review/product_review.service.ts:36-38,100-102` vs `modules/product_review/product_review.dto.ts:12,22`. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: remove the in-service rating checks (and the now-unused `INVALID_RATING` path) and rely on the DTO `safeParse` at the route.
- **[Dimension 5 — DB access] Multi-write vote path runs without a transaction** — `voteHelpful` performs vote upsert (`voteRepo.save`) then recomputes and saves `review.helpfulCount` (`reviewRepo.save`) as separate writes; a failure between them leaves `helpfulCount` inconsistent with the vote rows. Evidence: `modules/product_review/product_review.service.ts:160-171`. Rule: `database-patterns.md`. Fix: wrap the vote upsert + count + review save in `ds.transaction(async (m) => { ... })`.
- **[Dimension 9 — Caching] Cache busts do not fail open** — `bustReview`/`bustSummary` call `redis.del` unguarded, and they run inside the mutation path (`create`/`update`/`moderate`/`delete`). A transient Redis error throws and aborts/poisons an otherwise-successful DB write. Caching is infrastructure and must fail open. Evidence: `modules/product_review/product_review.service.ts:23-29,58,116-117,138-139,172,223-224`. Rule: `caching-patterns.md`. Fix: wrap each `redis.del` in `try/catch` that logs and swallows (fire-and-forget), as is already done for the read-side errors elsewhere.
- **[Dimension 11 — Logging and audit] Moderation and delete are not audit-logged** — `moderate` (status change to APPROVED/REJECTED/SPAM, attaches a moderation note) and `delete` (soft remove) are meaningful admin actions with no audit-log entry; only `voteHelpful` logs, and only on failure. Evidence: `modules/product_review/product_review.service.ts:125-141,216-225`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit-log record for moderate/delete (actor, reviewId, old→new status).

### 🔵 Low
- **[Dimension 7 — Authorization] No resource-level ownership check on update** — `update` lets any caller edit any review in the tenant; the "author can edit own review" rule is not enforced in-service (it relies entirely on the route layer). Acceptable per repo convention but a deviation from `authorization-and-rbac.md`. Evidence: `modules/product_review/product_review.service.ts:99-119`. Fix: optionally pass and assert the acting `userId` against `row.userId` for author edits.
- **[Dimension 4 — Messages] Unused message keys** — `REVIEW_CREATE_FAILED`, `REVIEW_UPDATE_FAILED`, `INVALID_STATUS` are defined but never used; status validation is handled by the `ReviewStatusEnum` DTO. Evidence: `modules/product_review/product_review.messages.ts:4-5,7`. Fix: drop the dead keys or wire them where relevant.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static methods, single default export, never instantiated |
| 2 | Boundary validation | ⚠️ | Output through `SafeProductReviewSchema`/`ProductReviewSummarySchema`; but ad-hoc rating `if/else` duplicates DTO |
| 3 | Error handling | ❌ | All throws are raw `new Error(...)`; no `AppError`/`ErrorCode`; not-found returns 500 not 404 |
| 4 | Messages pattern | ✅ | Uses `product_review.messages.ts`; no inline user-facing strings (a few unused keys) |
| 5 | DB access & entity ownership | ⚠️ | Entities under `entities/`, null-checked after `findOne`, no raw SQL; vote multi-write lacks a transaction |
| 6 | Multi-tenancy | ✅ | All queries use `tenantDataSourceFor` and filter by `tenantId`, incl. vote count and summary |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md) |
| 8 | Service composition & boundaries | ✅ | No sub-service cross-imports; cross-module imports use `@/` alias (`@/modules/db`, `@/modules/redis`, `@/modules/logger`) |
| 9 | Caching | ⚠️ | `singleFlight` on hot reads is good; but cache busts (`redis.del`) are unguarded and do not fail open |
| 10 | Secrets & config | ✅ | No `process.env` reads; infra via `@/modules/db`, `@/modules/redis` |
| 11 | Logging & audit | ⚠️ | No audit log for moderate/delete; only `voteHelpful` logs on failure |
| 12 | Security hardening | ✅ | UUID-typed inputs, no injection/SSRF surface, safe message strings, vote upsert avoids dup spam |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/snake files, PascalCase `ProductReviewService`, correct `.service/.dto/.types/.enums/.messages` suffixes |

## Recommendations
1. Replace all `throw new Error(...)` with `AppError(message, statusCode, ErrorCode.X)` so routes return correct HTTP statuses (404 for not-found, 400 for invalid input). (High)
2. Wrap `voteHelpful`'s vote upsert + count + review save in a single `ds.transaction(...)` to keep `helpfulCount` consistent. (Medium)
3. Guard every `redis.del` cache bust with a try/catch that logs and swallows, so cache failures never abort a successful DB write. (Medium)
4. Remove the redundant in-service rating validation and trust the DTO-validated input from the route. (Medium)
5. Add fire-and-forget audit-log entries for `moderate` and `delete`. (Medium)
6. Prune unused message keys; optionally enforce author-ownership on `update`. (Low)

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `zod-validation.md`, `database-patterns.md`, `caching-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md` · Source: `modules/product_review/product_review.service.ts`, `product_review.dto.ts`, `product_review.types.ts`, `product_review.enums.ts`, `product_review.messages.ts`, `entities/product_review.entity.ts`, `entities/product_review_vote.entity.ts`
