# tenant_invitation — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `tenant_invitation.service.ts`
> **Overall grade:** D · **Findings:** 1c / 4h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `tenant_invitation.service.ts` | 224 | Issue/preview/accept/decline/revoke tenant invitations, hashed-token lifecycle, auto-accept pending invites on signup, Redis read caching, webhook dispatch. |

## Findings

### 🔴 Critical
- **[Dimension 6 — Multi-tenancy] `getById` queries a tenant-scoped entity on the system DataSource with no tenantId filter** — `TenantInvitation` is a tenant-scoped entity (it carries a `tenantId` column and is written via `tenantDataSourceFor`); `getById` reads it from `getDataSource()` and filters only by `invitationId`. For shared-DB tenants (no dedicated `TenantDatabase` row, `tenantDataSourceFor` falls back to the base DataSource) this returns any tenant's invitation by id (cross-tenant / IDOR read); for dedicated-DB tenants it reads the wrong (system) DataSource and misses the row. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:62-63`. Rule: `multi-tenancy-patterns.md`. Fix: take `tenantId`, use `tenantDataSourceFor(tenantId)`, and add `tenantId` to the `where`.

### 🟠 High
- **[Dimension 6 — Multi-tenancy] `getByToken` and `autoAcceptForEmail` read the tenant entity from the system DataSource** — both query `TenantInvitation` via `getDataSource()` without a tenantId filter (`getByToken` by hashed token; `autoAcceptForEmail` by email/status across all tenants). The unique random token limits leakage for `getByToken`, but both use the wrong DataSource for a tenant-scoped entity and miss rows in dedicated-DB tenants. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:82-83`, `:200-203`. Rule: `multi-tenancy-patterns.md`. Fix: resolve the tenant DataSource (the token/email already implies the tenant after a scoped lookup) and scope queries per tenant.
- **[Dimension 3 — Error handling] All service throws use raw `new Error` instead of `AppError`** — every error path throws `new Error(TenantInvitationMessages.X)`, so a route handler cannot derive an HTTP status or `ErrorCode`. Affects not-found, conflict, validation, and gone cases. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:64,76,86,102,134,150,151,170,171,186,187,219-222`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(msg, 404|409|410, ErrorCode.NOT_FOUND|CONFLICT|VALIDATION_ERROR)` from `@/modules/common/app-error`.
- **[Dimension 3 — Error handling] `revoke` reuses `INVITATION_NOT_FOUND` for a non-pending (conflict) state** — when the invitation exists but is not `PENDING`, it throws `INVITATION_NOT_FOUND`, masking a 409-style conflict as a 404 (and as a raw Error). Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:187`. Rule: `error-handling-and-app-error.md`. Fix: throw an `AppError` with `409 / ErrorCode.CONFLICT` and a distinct message (e.g. only-pending-can-be-revoked).
- **[Dimension 5 — DB access] Multi-write operations run without a transaction** — `accept` creates a tenant member then updates invitation status (two writes); `send` revokes stale pending rows then saves a new invitation. A failure between steps leaves inconsistent state (member created but invite not accepted, or stale rows revoked but no replacement). Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:154-155`, `:108-119`. Rule: `database-patterns.md`. Fix: wrap same-DataSource writes in `ds.transaction(...)`; where member creation crosses services, ensure idempotency/compensation.

### 🟡 Medium
- **[Dimension 11 — Logging and audit] No audit log for invitation lifecycle actions** — send/accept/decline/revoke change membership-relevant state and emit webhooks but write no audit-log entry. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:121-125,157-161,176-179,190-193` (webhooks only). Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget audit-log each state transition with actor and target.
- **[Dimension 2 — Boundary validation] `where` clauses use `as any` casts** — `getByTenantId` builds a `Record<string, unknown>` and casts it `as any` into `repo.find/count`, bypassing typed query checks. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:39,47-48`. Rule: `validation-philosophy.md`. Fix: build a typed `FindOptionsWhere<TenantInvitationEntity>` instead of `as any`.
- **[Dimension 2 — Boundary validation] `memberRole` returned from DB is cast `as TenantMemberRole`** — the entity column is a plain `varchar`; the value is asserted rather than validated before being passed to `TenantMemberService.create`. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:154,209`. Rule: `zod-validation.md`. Fix: parse `memberRole` through `TenantMemberRoleEnum` before use.

### 🔵 Low
- **[Dimension 4 — Messages] Unused success-message keys / status-string literals inline** — status comparisons use bare `'PENDING'`/`'ACCEPTED'` etc. literals (acceptable as they mirror the enum), and several `*_SUCCESS`/success message keys are defined but unused in the service. Evidence: `modules/tenant_invitation/tenant_invitation.service.ts:108,219-222`; `tenant_invitation.messages.ts:11-14`. Rule: `module-messages-pattern.md`. Fix: optional — centralize status literals via `TenantInvitationStatusEnum` values for consistency.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default-export class, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | Output via `SafeTenantInvitationSchema`; but `as any` where-clauses and `as TenantMemberRole` cast bypass typing. |
| 3 | Error handling | ❌ | All throws are raw `new Error`; not-found reused for conflict in `revoke`. |
| 4 | Messages pattern | ✅ | Uses `tenant_invitation.messages.ts`; no inline user-facing prose. |
| 5 | DB access / entities | ⚠️ | DB only in service, entity in `entities/`, null-checked; but multi-write ops lack transactions. |
| 6 | Multi-tenancy | ❌ | `getById`/`getByToken`/`autoAcceptForEmail` use system DataSource without tenantId filter on a tenant entity. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | Calls `TenantMemberService`/`WebhookService` via facade defaults and `@/` alias; no sub-service cycles. |
| 9 | Caching | ✅ | singleFlight + negative cache + jittered TTL + fail-open on Redis errors. |
| 10 | Secrets and config | ✅ | TTLs from `@/modules/env`; no `process.env` read in service. |
| 11 | Logging and audit | ❌ | No audit log on send/accept/decline/revoke. |
| 12 | Security hardening | ✅ | Tokens hashed (sha256) at rest, random 32-byte raw token, email normalized, no injection/SSRF surface. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/suffixed files, PascalCase class, correct `.service/.dto/.types/.enums/.messages`. |

## Recommendations
1. **(Critical)** Scope `getById` to a tenant DataSource with a `tenantId` filter; have callers pass `tenantId`.
2. **(High)** Route `getByToken` and `autoAcceptForEmail` reads through the correct tenant DataSource; do not read tenant invitations off the system DataSource.
3. **(High)** Replace every `new Error(...)` with `AppError(message, statusCode, ErrorCode.X)`; give `revoke`'s non-pending case a distinct 409 conflict.
4. **(High)** Wrap `accept` and `send` multi-write sequences in a transaction (or make cross-service writes idempotent/compensating).
5. **(Medium)** Add fire-and-forget audit-log entries for each invitation state transition.
6. **(Medium)** Remove `as any` / `as TenantMemberRole` casts in favor of typed where-clauses and `TenantMemberRoleEnum.parse`.

## References
- Rules: `multi-tenancy-patterns.md`, `error-handling-and-app-error.md`, `database-patterns.md`, `logging-monitoring-and-audit-trails.md`, `validation-philosophy.md`, `zod-validation.md`, `module-messages-pattern.md` · Source: `modules/tenant_invitation/tenant_invitation.service.ts`
