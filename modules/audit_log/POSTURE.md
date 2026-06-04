# audit_log — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** audit_log.service.ts
> **Overall grade:** B · **Findings:** 0c / 0h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| audit_log.service.ts | 57 | Write audit-log rows (fire-and-forget) and paginate/query existing rows per tenant. |

## Findings

### 🟡 Medium
- **[Dimension 2 — Boundary validation] DTO `.parse()` throws raw ZodError, not AppError.** — `getAll` calls `GetAuditLogsDTO.parse(input)`, which throws a bare `ZodError` on invalid input; a route handler cannot derive an HTTP status from it without a global Zod-to-AppError adapter. The rules favour `safeParse` at the boundary with explicit error mapping. Evidence: `modules/audit_log/audit_log.service.ts:39`. Rule: `zod-validation.md`, `validation-philosophy.md`. Fix: use `safeParse` and throw `new AppError(AuditLogMessages.INVALID_INPUT, 400, ErrorCode.VALIDATION)` on failure, or document a global ZodError→AppError handler.
- **[Dimension 2 / 5 — Boundary validation / DB access] Untyped `as any` casts on the TypeORM `where` clause defeat type safety.** — The dynamically built filter object is cast with `where as any` for both `find` and `count`, bypassing TypeORM's `FindOptionsWhere<AuditLogRow>` typing and any compile-time guard against an invalid filter key. Evidence: `modules/audit_log/audit_log.service.ts:51,52`. Rule: `code-structure-ts-master.md`, `database-patterns.md`. Fix: type the filter as `FindOptionsWhere<AuditLogRow>` and drop the `as any`.
- **[Dimension 3 — Error handling] `getAll` performs no AppError mapping for query/DB failures.** — Unlike `log()` (correctly fire-and-forget), `getAll` lets any DB or validation error propagate as a raw error; there is no `AppError` with an explicit statusCode/ErrorCode for the fetch path. The module even ships `AuditLogMessages.FETCH_FAILED` but never uses it. Evidence: `modules/audit_log/audit_log.service.ts:37-55`; `modules/audit_log/audit_log.messages.ts:4`. Rule: `error-handling-and-app-error.md`. Fix: wrap the query path and throw `new AppError(AuditLogMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL)` on DB failure.

### 🔵 Low
- **[Dimension 4 — Messages pattern] `audit_log.messages.ts` exists but is entirely unused by the service.** — No hardcoded user-facing strings appear in the service (the `[AUDIT]` lines are operator log lines, which is fine), but the dedicated messages file is dead code; wiring it into the error/validation paths above would resolve both this and the Medium error-handling finding. Evidence: `modules/audit_log/audit_log.messages.ts:1-7` (no import in `audit_log.service.ts`). Rule: `module-messages-pattern.md`. Fix: reference `AuditLogMessages` from the AppError throws added per the Medium findings.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class with only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | DTO `.parse()` (not safeParse) at boundary; output filtered via `AuditLogSchema.parse`; `as any` on where. |
| 3 | Error handling | ⚠️ | `log()` correctly fire-and-forget; `getAll` has no AppError mapping for fetch failures. |
| 4 | Messages pattern | ⚠️ | No hardcoded user-facing strings, but `audit_log.messages.ts` is unused. |
| 5 | DB access & entity ownership | ✅ | DB only in service, entity under `entities/`, no raw SQL, single-write (no tx needed). |
| 6 | Multi-tenancy | ✅ | Uses `tenantDataSourceFor(tenantId)`; every query filtered by `tenantId` (ROOT fallback for platform events). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Cross-module imports use `@/` alias; no sub-service cross-imports or cycles. |
| 9 | Caching | — | No hot read path requiring cache; N/A. |
| 10 | Secrets & config | ✅ | No `process.env` reads; no secrets in service. |
| 11 | Logging & audit | ✅ | This is the audit primitive itself; logs via `Logger`, no secret leakage in log lines. |
| 12 | Security hardening | ✅ | `ILike` is parameterized by TypeORM (no injection); pagination capped at pageSize ≤ 100 via DTO. |
| 13 | Naming & file organization | ✅ | snake_case module, correct file suffixes, PascalCase class. |

## Recommendations
1. In `getAll`, switch to `safeParse` and wrap the query in try/catch, throwing `AppError(..., 400, ErrorCode.VALIDATION)` and `AppError(AuditLogMessages.FETCH_FAILED, 500, ErrorCode.INTERNAL)` respectively — resolves the Dimension 2, 3 and 4 findings at once.
2. Type the dynamic filter as `FindOptionsWhere<AuditLogRow>` and remove both `as any` casts (lines 51-52).
3. Keep `log()` as-is — its blanket catch + `Logger.error` is the correct fire-and-forget posture for an audit writer.

## References
- Rules: `zod-validation.md`, `validation-philosophy.md`, `error-handling-and-app-error.md`, `module-messages-pattern.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `database-patterns.md`, `code-structure-ts-master.md` · Source: `modules/audit_log/audit_log.service.ts`, `audit_log.dto.ts`, `audit_log.types.ts`, `audit_log.messages.ts`, `audit_log.enums.ts`, `entities/audit_log.entity.ts`
