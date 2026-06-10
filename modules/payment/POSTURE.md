# payment — Posture Review

> **Uygulandı:** 2026-06-10 — High AppError (payment.service.ts 17 site, webhook.service.ts 3 site, webhook.stripe.service.ts 3 site, webhook.paypal.service.ts 4 site → AppError ile doğru HTTP status kodları).

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** payment.service.ts, payment.proration.service.ts, payment.webhook.service.ts, payment.webhook.handlers.service.ts, payment.webhook.notifications.service.ts, payment.webhook.paypal.service.ts, payment.webhook.stripe.service.ts
> **Overall grade:** C · **Findings:** 0c / 3h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| payment.service.ts | 611 | Payment/transaction CRUD, refunds, provider facade (checkout, direct/3DS charge, intents, BIN, portal). |
| payment.proration.service.ts | 91 | Pure proration arithmetic and invoice-line shaping. No I/O. |
| payment.webhook.service.ts | 90 | Inbound webhook entry; delegates Stripe/PayPal, handles Iyzico callback inline. |
| payment.webhook.handlers.service.ts | 269 | Routes normalized events to domain side effects (payment + subscription state, audit, webhook fan-out). |
| payment.webhook.notifications.service.ts | 107 | Renewal-invoice issuance + dunning email fan-out to tenant admins. |
| payment.webhook.paypal.service.ts | 142 | PayPal signature verify + event normalization. |
| payment.webhook.stripe.service.ts | 123 | Stripe HMAC signature verify + event normalization. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error(...)` instead of `AppError` everywhere** — Every service throws `new Error(PAYMENT_MESSAGES.X)`, so a route handler cannot derive an HTTP status. Pervasive across `payment.service.ts` (e.g. `:119`, `:171`, `:185`, `:203`, `:238`, `:265`, `:272`, `:282`, `:306`, `:320`, `:354`, `:372`, `:389`, `:390`, `:395`, `:478`, `:499`), `payment.webhook.service.ts:43,50,76`, `payment.webhook.stripe.service.ts:101,105,112`, `payment.webhook.paypal.service.ts:17,110,116,131`. Evidence: `modules/payment/payment.service.ts:185`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw with explicit statusCode + ErrorCode (404 NOT_FOUND for not-found, 422 for refund-rule violations, 502 for provider/verification failures, 400 for invalid signature).
- **[Dimension 6 — Multi-tenancy] Tenant-scoped reads/writes go through the system DataSource** — `payments` and `payment_transactions` carry a `tenantId` column, yet most reads run on `getDataSource()` and filter by tenantId only when the caller happens to pass one. `getById`/`getByIdWithTransactions` look up by `paymentId` PK on the system DS with no tenantId scoping at all (`payment.service.ts:184`, `:202`), and `getAll`/`getTransactions` make tenantId an *optional* filter (`payment.service.ts:217`, `:332`). Writes are inconsistent: `update`/`delete`/`refund` re-resolve to `tenantDataSourceFor(existing.tenantId)` for the write (`:240`, `:274`, `:410`) but read the row from the system DS first. Evidence: `modules/payment/payment.service.ts:175`. Rule: `multi-tenancy-patterns.md`. Fix: decide whether `payments` is a system table or a tenant table and use one DataSource consistently; if tenant-scoped, require tenantId on every read path and resolve via `tenantDataSourceFor(tenantId)` before lookup so a payment can only be fetched within its tenant.
- **[Dimension 2 — Boundary validation] Dynamic `where` and update payloads cast to `any`** — `where as any` (`payment.service.ts:228`, `:229`, `:343`, `:344`) and `... as any` on update payloads (`:259`, `:366`, `:415`) bypass TypeORM's typed filter checks, so a typo in a filter/column key fails silently instead of at compile time. Output is correctly funneled through `Safe*Schema`, so the gap is in the query-construction layer. Evidence: `modules/payment/payment.service.ts:228`. Rule: `validation-philosophy.md`. Fix: build a typed `FindOptionsWhere<PaymentEntity>` / `QueryDeepPartialEntity` instead of `Record<string, unknown>` + `as any`.

### 🟡 Medium
- **[Dimension 12 — Security hardening] Iyzico callback dispatches on provider status with no inbound signature check** — `handleIyzicoCallback` authenticates its *outbound* lookup (HMAC), but the *inbound* callback `token` is never verified against a signature the way Stripe (`verifyStripeSignature`) and PayPal (`verifyPaypalSignature`) are; whatever the lookup returns with `paymentStatus === 'SUCCESS'` is treated as authoritative. A guessed/replayed token triggers a real provider call and dispatch. Evidence: `modules/payment/payment.webhook.service.ts:42`. Rule: `security-hardening.md`. Fix: rate-limit the Iyzico callback route and bind the token to a known pending payment (single-use) before lookup.
- **[Dimension 5 — DB access] `refund` performs a multi-row money mutation without a transaction** — `createTransaction` (insert) and the subsequent payment-balance `update` (`payment.service.ts:397`–`:415`) are two independent writes; a crash between them leaves a REFUND transaction recorded with `refundedAmount` unchanged (or vice-versa). Evidence: `modules/payment/payment.service.ts:386`. Rule: `database-patterns.md`. Fix: wrap the refund insert and the balance update in a single `dataSource.transaction(...)`.
- **[Dimension 5 — DB access] Concurrent refunds can over-refund (no row lock / re-read)** — `maxRefundable` is computed from a row read outside any lock (`payment.service.ts:393`–`:395`); two simultaneous partial refunds each see the same `refundedAmount` and can collectively exceed `amount`. Evidence: `modules/payment/payment.service.ts:392`. Rule: `database-patterns.md`. Fix: re-read with a `pessimistic_write` lock inside the transaction, or apply an atomic conditional UPDATE guarded on the current `refundedAmount`.
- **[Dimension 11 — Logging/audit] Core PaymentService mutations are not audit-logged** — Webhook handlers audit thoroughly (`payment.webhook.handlers.service.ts:63`, `:93`, …), but direct `create` / `update` / `delete` / `refund` in `payment.service.ts` write no `AuditLogService` entry, so an admin-initiated refund or status change leaves no audit trail. Evidence: `modules/payment/payment.service.ts:386`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget `AuditLogService.log(...)` on refund / status transitions / delete.

### 🔵 Low
- **[Dimension 4 — Messages] Inline customer-facing strings in proration lines** — `prorationLines` builds invoice-line descriptions inline (`payment.proration.service.ts:73`, `:82`); these surface on customer invoices yet are not in `payment.messages.ts`. Evidence: `modules/payment/payment.proration.service.ts:73`. Rule: `module-messages-pattern.md`. Fix: move customer-facing description templates into `payment.messages.ts`.
- **[Dimension 5 — DB access] Hardcoded placeholder customer email on renewal invoices** — `issueRenewalInvoice` falls back to `'unknown@example.com'` / `'Customer'` (`payment.webhook.notifications.service.ts:38`–`:39`) and then issues + marks-paid a real invoice with that data. Evidence: `modules/payment/payment.webhook.notifications.service.ts:38`. Rule: `database-patterns.md`. Fix: skip issuance (or keep draft) when real customer info is absent rather than persisting a placeholder.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All services are static-only classes with a single default export; never instantiated. |
| 2 | Boundary validation | ⚠️ | Output via `Safe*Schema` everywhere; but `where`/update casts to `any` bypass typed filters. |
| 3 | Error handling | ❌ | Raw `throw new Error(...)` throughout; never `AppError` + ErrorCode. |
| 4 | Messages pattern | ⚠️ | Mostly `PAYMENT_MESSAGES`; a few inline customer-facing strings in proration. |
| 5 | DB access & entities | ⚠️ | Entities owned, null-checks present; refund lacks a transaction + lock. |
| 6 | Multi-tenancy | ❌ | Tenant-scoped reads run on system DS; tenantId is an optional filter, PK reads unscoped. |
| 7 | Authorization / RBAC | ⚠️ | Authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | Clean facade: webhook sub-services delegated, cross-module via `@/` imports, lazy-import breaks a cycle. |
| 9 | Caching | ✅ | Read paths use singleFlight + jittered TTL + fail-open; cache errors swallowed correctly. |
| 10 | Secrets & config | ✅ | Config via `@/modules/env` (Zod-validated); provider secrets via SettingService; no `process.env.X` in services. |
| 11 | Logging & audit | ⚠️ | Webhook side effects audited fire-and-forget; direct PaymentService mutations not audited. |
| 12 | Security hardening | ⚠️ | Stripe/PayPal signature-verified (timingSafeEqual); Iyzico callback lacks inbound signature/rate-limit. |
| 13 | Naming & file organization | ✅ | snake_case module, dotted `.service.ts` suffixes, PascalCase classes, correct file layout. |

## Recommendations
1. Replace every `throw new Error(PAYMENT_MESSAGES.X)` with `throw new AppError(PAYMENT_MESSAGES.X, <status>, ErrorCode.X)` so routes return correct HTTP statuses (404 not-found, 422 refund-rule, 502 provider/verify, 400 bad-signature).
2. Settle the tenancy model for `payments`/`payment_transactions`: pick one DataSource and require tenantId on every read so `getById` cannot return a cross-tenant payment by PK.
3. Wrap `refund` in `dataSource.transaction(...)` with a `pessimistic_write` re-read (or atomic guarded UPDATE) to make the balance change atomic and over-refund-safe.
4. Add a signature/replay defense + rate limit to the Iyzico callback to match the Stripe/PayPal posture.
5. Audit-log direct PaymentService mutations (refund, status transitions, delete) fire-and-forget.
6. Replace `Record<string,unknown>` + `as any` query construction with typed `FindOptionsWhere` / `QueryDeepPartialEntity`; move customer-facing proration strings into `payment.messages.ts`; stop persisting placeholder customer info on renewal invoices.

## References
- Rules: error-handling-and-app-error.md, multi-tenancy-patterns.md, validation-philosophy.md, database-patterns.md, security-hardening.md, logging-monitoring-and-audit-trails.md, authorization-and-rbac.md, caching-patterns.md, module-messages-pattern.md · Source: modules/payment/payment.service.ts, payment.proration.service.ts, payment.webhook.service.ts, payment.webhook.handlers.service.ts, payment.webhook.notifications.service.ts, payment.webhook.paypal.service.ts, payment.webhook.stripe.service.ts
