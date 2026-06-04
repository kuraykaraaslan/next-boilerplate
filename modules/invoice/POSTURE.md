# invoice — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `invoice.service.ts`, `invoice.pdf.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `invoice.service.ts` | 399 | Invoice CRUD, state transitions (issue/markPaid/markVoid), regional adapter submission, TR e-Arşiv SMS-OTP finalisation, invoice-number sequence. |
| `invoice.pdf.service.ts` | 321 | Renders invoice PDFs (jsPDF + autotable), synthetic preview, render-and-store to storage. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown throughout instead of `AppError`** — Every failure path throws `new Error(InvoiceMessages.X)` with no `statusCode`/`ErrorCode`, so a route handler cannot derive an HTTP status (e.g. NOT_FOUND should be 404, ALREADY_ISSUED 409, COMPANY_INFO_MISSING 422). Evidence: `modules/invoice/invoice.service.ts:47,134,167,168,232,273,274,303,310,327,356,362` and `modules/invoice/invoice.pdf.service.ts:80,121`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and replace each raw throw, e.g. `throw new AppError(InvoiceMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND)`, `ALREADY_ISSUED`/`CANNOT_VOID_PAID` → 409 `CONFLICT`, `COMPANY_INFO_MISSING` → 422 `VALIDATION_ERROR`.

### 🟡 Medium
- **[Dimension 5 — DB access] Multi-write create is not wrapped in a transaction** — `create()` saves the invoice row, then loops to save each line in separate writes; a failure mid-loop leaves a header with partial/zero lines. Evidence: `modules/invoice/invoice.service.ts:86-112`. Rule: `database-patterns.md`. Fix: wrap the invoice + line inserts in `ds.transaction(async (m) => …)` so header and lines commit atomically.
- **[Dimension 12 — Security hardening] No rate limiting on the e-Arşiv SMS-OTP flow** — `requestEarsivSms` triggers an outbound OTP send and `confirmEarsivSms` verifies a user-supplied code with no attempt throttling, enabling SMS-bombing and OTP brute force. Evidence: `modules/invoice/invoice.service.ts:319-329,336-363`. Rule: `security-hardening.md`. Fix: apply the limiter module to both OTP send and verify (per-tenant), and cap verify attempts per `oid`.
- **[Dimension 2 — Boundary validation] Unsafe `as any` cast on the storage upload payload** — The upload options are cast `as any`, bypassing `StorageService.uploadFile` typing and silently allowing shape drift. Evidence: `modules/invoice/invoice.pdf.service.ts:128`. Rule: `validation-philosophy.md`. Fix: type the payload against StorageService's input type (or its Zod input schema) and drop the cast.
- **[Dimension 7 — Authorization / RBAC] No resource-level ownership/role check inside the service** — Services trust the `tenantId` argument and enforce no in-service ownership/role check; authz enforced at route layer; resource-level check not in service (deviation from `authorization-and-rbac.md`). Feature gating is present for `create` (`FEATURE_INVOICING`) but state transitions, PDF render, and the OTP flow have none. Evidence: `modules/invoice/invoice.service.ts:163,228,269,319,336`; `modules/invoice/invoice.pdf.service.ts:77,116`. Rule: `authorization-and-rbac.md`. Fix: confirm route-layer RBAC covers each mutating handler; consider feature-gating issue/OTP paths.

### 🔵 Low
- **[Dimension 4 — Messages] Hardcoded inline PDF label strings in the service** — The PDF service embeds inline literals (`'e-Arşiv: '`, `'Peppol: '`) and synthetic-preview sample strings directly rather than sourcing them from the `PDF_LABELS` map. These are document-render labels / preview fixtures (not error/user-facing API strings), so impact is minor, but they bypass the messages pattern. Evidence: `modules/invoice/invoice.pdf.service.ts:228,230,97-111`. Rule: `module-messages-pattern.md`. Fix: move the static `e-Arşiv`/`Peppol` labels into `PDF_LABELS`.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Both classes are all-static, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Input re-parsed via `CreateInvoiceInputSchema`, output through `Safe*Schema`; weakened by `as any` upload cast at `invoice.pdf.service.ts:128`. |
| 3 | Error handling | ❌ | Raw `new Error(...)` everywhere instead of `AppError` with statusCode/ErrorCode. |
| 4 | Messages pattern | ⚠️ | Errors use `invoice.messages.ts`; a few inline PDF labels (`e-Arşiv:`/`Peppol:`) remain. |
| 5 | DB access & entity ownership | ⚠️ | Entities under `entities/`, null-checked, parameterised QB; create multi-write lacks a transaction. |
| 6 | Multi-tenancy | ✅ | All queries use `tenantDataSourceFor(tenantId)` and filter by `tenantId`. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Cross-module deps via facades + `@/` alias (Setting, Audit, Webhook, Mail, Storage, FeatureGate). |
| 9 | Caching | — | No cache on read paths; optional infra, read paths not obviously hot — N/A. |
| 10 | Secrets & config | ✅ | No `process.env` reads; GİB creds via SettingService, not logged. |
| 11 | Logging & audit | ✅ | Meaningful actions audit-logged fire-and-forget; warn-level logs avoid secret leakage. |
| 12 | Security hardening | ⚠️ | OTP send/verify lack rate limiting and attempt caps. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase classes, correct `.service.ts`/`.entity.ts`. |

## Recommendations
1. **(High)** Replace every `throw new Error(InvoiceMessages.X)` in both services with `AppError(message, statusCode, ErrorCode)` mapped to the correct HTTP semantics (404 / 409 / 422).
2. **(Medium)** Wrap `create()`'s invoice-header + line inserts in `ds.transaction(...)` for atomicity.
3. **(Medium)** Add limiter-module rate limiting and per-`oid` attempt caps to `requestEarsivSms` / `confirmEarsivSms`.
4. **(Medium)** Remove the `as any` cast at `invoice.pdf.service.ts:128` and type the storage upload payload.
5. **(Low)** Move remaining inline PDF labels (`e-Arşiv:`, `Peppol:`) into `PDF_LABELS`.

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `security-hardening.md`, `validation-philosophy.md`, `authorization-and-rbac.md`, `module-messages-pattern.md`, `multi-tenancy-patterns.md`, `caching-patterns.md` · Source: `modules/invoice/invoice.service.ts`, `modules/invoice/invoice.pdf.service.ts`
