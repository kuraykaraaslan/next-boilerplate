# payment_sell — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_sell.service.ts`, `payment_sell.webhook.service.ts`
> **Overall grade:** D · **Findings:** 1c / 2h / 4m / 3l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_sell.service.ts` | 269 | Checkout creation, payment CRUD/list, refunds, transaction create/list, provider status & customer portal; multi-provider routing via a static provider map. |
| `payment_sell.webhook.service.ts` | 60 | Applies normalized provider webhook events (completed/failed/expired/refunded) to the matching tenant payment row, invalidates cache. |

## Findings

### 🔴 Critical
- **[Dimension 6 — Multi-tenancy] Transaction queries are not tenant-isolated** — `payment_transactions` has no `tenantId` column, and `listTransactions` / `createTransaction` operate purely on a caller-supplied `paymentId` with no check that the payment belongs to `tenantId`. The `tenantId` argument is used only to select the DataSource; in shared-DB fallback mode (`tenantDataSourceFor` returns the base DataSource when no per-tenant DB row exists, `modules/db/db.ts:185`) a caller passing another tenant's `paymentId` can read or write that tenant's transaction rows (IDOR / cross-tenant leak). Evidence: `modules/payment_sell/payment_sell.service.ts:217-222` (`createTransaction` ignores `tenantId`, inserts on `data.paymentId`), `modules/payment_sell/payment_sell.service.ts:229-240` (`listTransactions` filters only by `paymentId`/`type`/`status`); entity has no `tenantId`: `modules/payment_sell/entities/payment_transaction.entity.ts:4-11`. Rule: `multi-tenancy-patterns.md`. Fix: load the parent `Payment` with `where: { tenantId, paymentId }` first and reject if absent (as `getWithTransactions` does at `:125`), or add a `tenantId` column to `payment_transactions` and filter on it.

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — every failure path throws `new Error(PAYMENT_SELL_MESSAGES.X)`, so route handlers cannot derive an HTTP status or `ErrorCode`. Evidence: `modules/payment_sell/payment_sell.service.ts:53,78,117,126,160,181,183,189,200,252` and `modules/payment_sell/payment_sell.webhook.service.ts:57`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(message, 404|409|422|502, ErrorCode.X)` (404 not-found, 409/422 invalid-state/amount, 502 provider failures).
- **[Dimension 11 — Logging & audit] No audit trail for financial mutations** — checkout, status updates, and refunds (money movement) are not audit-logged; only provider failures hit `Logger.error`. Evidence: `modules/payment_sell/payment_sell.service.ts:61-107` (createCheckout), `156-171` (update), `177-211` (refund) — no audit-log call on success. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit-log entry (actor, tenantId, paymentId, amount, old→new status) on checkout, status change, and refund.

### 🟡 Medium
- **[Dimension 5 — DB access] Multi-write refund/checkout not wrapped in a transaction** — `refund` performs an external provider call then `repo.save`, and `createCheckout` saves a payment after a remote session call; partial failures leave inconsistent state. Refund mutates `refundedAmount`/`status` without a row lock, so concurrent refunds can double-spend the remaining balance. Evidence: `modules/payment_sell/payment_sell.service.ts:192-210` (refund), `81-98` (checkout). Rule: `database-patterns.md`. Fix: wrap the read-modify-write in `ds.transaction(...)` with a pessimistic lock on the payment row for refunds.
- **[Dimension 9 — Caching] Cache invalidation is not fail-open** — `redis.del(...)` is awaited and unguarded inside `update`, `refund`, and `createTransaction`; a Redis error throws and aborts an already-committed DB write. Evidence: `modules/payment_sell/payment_sell.service.ts:168-169,209,222`. Rule: `caching-patterns.md`. Fix: wrap invalidation in a try/catch (or `.catch(() => {})`) so cache failures do not fail the request.
- **[Dimension 12 — Security] No idempotency or rate limiting on refund** — `refund` is a money-moving operation with no idempotency key and no rate guard; a retried request can issue duplicate provider refunds up to the balance. Evidence: `modules/payment_sell/payment_sell.service.ts:177-211`. Rule: `security-hardening.md`. Fix: gate refunds with the limiter/idempotency middleware or a per-payment idempotency key on the provider call.
- **[Dimension 7 — Authorization] No resource-level ownership/role check in service** — services trust the `tenantId`/`userId` arguments and perform no in-service role or ownership verification on payment-scoped operations. Per house convention this is enforced at the route layer. Evidence: `modules/payment_sell/payment_sell.service.ts:156,177,247`. Rule: `authorization-and-rbac.md`. Fix: acceptable if route middleware enforces RBAC; otherwise add a resource-level check (note: this overlaps the Critical transaction-isolation gap above).

### 🔵 Low
- **[Dimension 2 — Boundary validation] DTO mutated via `as any` casts** — `update` patches `paidAt`/`cancelledAt`/`refundedAt` onto the typed DTO using `(data as any)`, bypassing the type system. Evidence: `modules/payment_sell/payment_sell.service.ts:162-164`. Rule: `validation-philosophy.md`. Fix: build a separate typed patch object instead of casting the DTO.
- **[Dimension 8 — Service composition] Cross-module imports use relative paths, not the `@/` alias** — both services import `payment_core` symbols (and the provider classes) via relative `../payment_core/...` paths and reach directly into `../payment_core/providers/*` rather than the `@/modules/payment_core` boundary. Evidence: `modules/payment_sell/payment_sell.service.ts:7-14,27` and `modules/payment_sell/payment_sell.webhook.service.ts:7-8`. Rule: `import-rules.md`. Fix: import cross-module symbols via the `@/modules/payment_core` alias and expose providers through a payment_core facade instead of deep relative imports.
- **[Dimension 13 — Naming/organization] Unused import** — `PaymentCurrencyEnum` is imported but never referenced in `payment_sell.types.ts` (currency fields use `z.string().max(3)`). Evidence: `modules/payment_sell/payment_sell.types.ts:2`. Rule: `file-organization.md`. Fix: remove the dead import.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Static-only methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Trusts typed DTOs and parses output via Safe* schemas; `as any` DTO mutation in `update`. |
| 3 | Error handling | ❌ | Raw `new Error(...)` throughout instead of `AppError` + `ErrorCode`. |
| 4 | Messages pattern | ✅ | All user-facing strings sourced from `payment_sell.messages.ts`; no inline literals. |
| 5 | DB access & entities | ⚠️ | DB confined to service, entities under `entities/`, null-checked; multi-write refund/checkout lack transactions/locks. |
| 6 | Multi-tenancy | ❌ | Payment queries filter by `tenantId`, but transaction read/write paths are not tenant-isolated (cross-tenant IDOR in shared-DB fallback). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ⚠️ | Webhook delegates to facade methods and no cycles, but cross-module `payment_core` imports use relative paths instead of the `@/` alias. |
| 9 | Caching | ⚠️ | Uses `singleFlight` reads + invalidation, but `redis.del` not fail-open on writes. |
| 10 | Secrets & config | ✅ | Config via `@/modules/env` (`TENANT_CACHE_TTL`); no `process.env` reads in service. |
| 11 | Logging & audit | ❌ | No audit log for checkout/update/refund (financial actions); only error logging. |
| 12 | Security hardening | ⚠️ | Refund amount validated, but no idempotency/rate limiting on refunds. |
| 13 | Naming & organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase classes; one unused import. |

## Recommendations
1. **Close the transaction tenant-isolation gap (Critical):** in `createTransaction` and `listTransactions`, resolve the parent payment via `{ tenantId, paymentId }` and reject when absent, or add a `tenantId` column to `payment_transactions` and filter on it.
2. **Replace every `new Error(...)` with `AppError`** carrying an explicit `statusCode` and `ErrorCode` so the API surfaces correct HTTP statuses.
3. **Add audit logging** (fire-and-forget) for checkout creation, status transitions, and refunds, including amount and old→new status.
4. **Wrap refund and checkout in a DB transaction** with a row lock on the payment to prevent partial state and concurrent over-refund; add idempotency/rate limiting to refund.
5. **Make cache invalidation fail-open**, route `payment_core` imports through the `@/` alias, and drop the `as any` DTO mutation and the unused `PaymentCurrencyEnum` import.

## References
- Rules: `error-handling-and-app-error.md`, `multi-tenancy-patterns.md`, `database-patterns.md`, `logging-monitoring-and-audit-trails.md`, `caching-patterns.md`, `security-hardening.md`, `authorization-and-rbac.md`, `import-rules.md` · Source: `modules/payment_sell/payment_sell.service.ts`, `modules/payment_sell/payment_sell.webhook.service.ts`
