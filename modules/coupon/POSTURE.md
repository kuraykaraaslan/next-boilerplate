> **Uygulandı** — 2026-06-10: All raw Error throws → AppError (409 CONFLICT, 404 NOT_FOUND, 422 VALIDATION_ERROR, 500 INTERNAL_ERROR); AppError re-throw guards in update/apply/getRedemptionsByTenant catch blocks; apply() redemption save + usedCount increment wrapped in ds.transaction(); webhook dispatches → .catch(() => {}) fail-open.

# coupon — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `coupon.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 3m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `coupon.service.ts` | 409 | Admin coupon CRUD, cached reads, scope/discount evaluation, validation, redemption apply + counting. |

## Findings

### 🟠 High

- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — Every thrown error uses `throw new Error(COUPON_MESSAGES.X)` (or `validation.message`), so a route handler cannot derive an HTTP status (404 NOT_FOUND vs 409 CODE_EXISTS vs 500 *_FAILED all collapse to a generic 500). Evidence: `modules/coupon/coupon.service.ts:49` (CODE_EXISTS → should be 409 CONFLICT), `:80`, `:103`, `:117` (NOT_FOUND → 404), `:151`, `:180`, `:188`, `:331`, `:372`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(COUPON_MESSAGES.NOT_FOUND, 404, ErrorCode.NOT_FOUND)`, `new AppError(COUPON_MESSAGES.CODE_EXISTS, 409, ErrorCode.CONFLICT)`, etc.; keep the `*_FAILED` wrappers as 500 INTERNAL_ERROR.

### 🟡 Medium

- **[Dimension 5 — DB access / transactions] `apply()` performs a multi-write without a transaction** — `redemptionRepo.save()` then `CouponEntity.increment(usedCount)` run as two independent writes (`:352`, `:354-356`). If the increment fails after the redemption is saved, `usedCount` and the redemption ledger diverge, and concurrent applies can also overshoot `maxUses` (the read-modify-write across `validate`→`save`→`increment` is not atomic). Evidence: `modules/coupon/coupon.service.ts:337-356`. Rule: `database-patterns.md`. Fix: wrap both writes in `tenantDs.transaction(async (mgr) => {...})`; consider a guarded conditional increment / `SELECT ... FOR UPDATE` to enforce `maxUses` under concurrency.
- **[Dimension 11 — Logging / audit] Admin mutations are not audit-logged** — `create`, `update`, `archive`, and `apply` change tenant state but only emit webhook events and error-path `Logger.error`; there is no fire-and-forget audit-log entry for who created/updated/archived/applied a coupon. Evidence: `modules/coupon/coupon.service.ts:43-82` (create), `:147-182` (update), `:184-191` (archive), `:318-374` (apply). Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit an `AuditLogService` entry (fire-and-forget) on each mutation; `archive` in particular logs nothing at all.
- **[Dimension 12 — Security hardening] No rate limiting on public `validate` / `apply`** — These accept a user-supplied `code` and are the natural targets of coupon brute-forcing / enumeration; the service applies no rate limiting and there is no in-service throttle keyed by tenant/user. The negative cache (`:128`, `:137`) helps DB load but does not cap attempt rate. Evidence: `modules/coupon/coupon.service.ts:197-250`, `:318-332`. Rule: `security-hardening.md`. Fix: gate `validate`/`apply` behind the limiter module (per-tenant + per-IP/user) at the route or service edge.

### 🔵 Low

- **[Dimension 2 — Boundary validation] `apply` propagates a free-form `validation.message` into the error channel** — `validate`/`apply` re-throw `validation.message` (a control-flow string) via `throw new Error(...)` at `:331`, mixing a structured-result value into the error path. Evidence: `modules/coupon/coupon.service.ts:330-332`. Rule: `validation-philosophy.md`. Fix: throw an `AppError` with `ErrorCode.VALIDATION_ERROR` and a fixed message; keep `validation.message` for the structured result only.
- **[Dimension 9 — Caching] `getAll` / `getRedemptionsByTenant` listing reads are uncached** — Acceptable (paginated admin lists are not hot and are hard to invalidate), noted only for completeness; single-entity reads correctly use `singleFlight` + jittered TTL + negative cache + fail-open. Evidence: `modules/coupon/coupon.service.ts:84-105`, `:380-399` vs `:107-145`. Rule: `caching-patterns.md`. Fix: none required.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class CouponService`, all-static, never instantiated. |
| 2 | Boundary validation | ✅ | Route DTOs typed; DB output parsed through `CouponSchema` / `CouponRedemptionSchema` / `CouponValidationResultSchema` on every return. Minor: error-channel string at `:331` (Low). |
| 3 | Error handling | ❌ | All throws are raw `new Error(...)`; no `AppError`/status/`ErrorCode` (`:49,80,103,117,151,180,188,331,372`). |
| 4 | Messages pattern | ✅ | All user-facing text from `coupon.messages.ts` (`COUPON_MESSAGES`); no inline hardcoded strings in the service. |
| 5 | DB access & entity ownership | ⚠️ | Entities under `entities/`, null-checked after `findOne`, no raw SQL; but `apply()` multi-write lacks a transaction (`:337-356`). |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters by `tenantId` (`:48,89,116,135,150,167,189,354,389,404`). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Cross-module `WebhookService` used via facade default export + `@/` alias; no sub-service cross-imports/cycles. |
| 9 | Caching | ✅ | `singleFlight`, jittered TTL, negative cache, fail-open `.catch(()=>{})` on `getById`/`getByCode`. Listing reads uncached (Low, acceptable). |
| 10 | Secrets & config | ✅ | Config via `@/modules/env` (`TENANT_CACHE_TTL`); no `process.env.X` in service. |
| 11 | Logging & audit | ⚠️ | Error-path `Logger.error` + webhook events present, no secret leakage; no audit-log of admin/apply mutations. |
| 12 | Security hardening | ⚠️ | Safe messages, percentage/amount clamping; no rate limiting on public `validate`/`apply` (brute-force surface). |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase `CouponService`, correct `.service.ts`/`.entity.ts` suffixes. |

## Recommendations
1. **Replace all raw `throw new Error(...)` with `AppError`** (High) — map NOT_FOUND→404/`NOT_FOUND`, CODE_EXISTS→409/`CONFLICT`, `*_FAILED`→500/`INTERNAL_ERROR`; this is the only thing standing between this module and a B.
2. **Wrap `apply()` writes in a transaction** and enforce `maxUses` atomically (guarded increment or `FOR UPDATE`) to prevent ledger drift and over-redemption under concurrency.
3. **Add fire-and-forget audit-log entries** for `create`/`update`/`archive`/`apply` (especially `archive`, which currently logs nothing).
4. **Rate-limit public `validate`/`apply`** per tenant + IP/user to blunt coupon enumeration/brute-force.
5. (Low) In `apply`, throw a fixed-message `AppError(ErrorCode.VALIDATION_ERROR)` instead of re-throwing the free-form `validation.message`.

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `logging-monitoring-and-audit-trails.md`, `security-hardening.md`, `authorization-and-rbac.md`, `caching-patterns.md`, `code-structure-ts-master.md` · Source: `modules/coupon/coupon.service.ts`
