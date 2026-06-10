> **Uygulandı** — 2026-06-10: All 6 raw throw new Error → AppError (403 FORBIDDEN for self/role/membership-role guards, 404 NOT_FOUND for missing user/member); SafeUserSchema.parse(targetUser) replaces inline object with as-any casts; ImpersonationSessionMetaSchema (z.object+passthrough) replaces (session.metadata as any) probe; GLOBAL_ROLE_ORDER derived from UserRoleEnum.options; pruned unused message keys (NOT_IMPERSONATING, CANNOT_REFRESH_IMPERSONATION_SESSION, INSUFFICIENT_PRIVILEGES).

# auth_impersonation — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** impersonation.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| impersonation.service.ts | 207 | System- and tenant-scoped admin impersonation: validate impersonator privilege, resolve target user/membership, mint an impersonation session via UserSessionService, end sessions, and resolve the active impersonation session from an access token. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — All six failure paths throw `new Error(ImpersonationMessages.X)` rather than `new AppError(message, statusCode, ErrorCode.X)`. A route handler cannot derive an HTTP status (e.g. 403 for privilege failures, 404 for missing target) from a raw `Error`, so impersonation denials collapse to a generic 500. Evidence: `modules/auth_impersonation/impersonation.service.ts:45`, `:116`, `:122`, `:125`, `:195`, `:203`. Rule: `error-handling-and-app-error.md`. Fix: import `{ AppError, ErrorCode }` from `@/modules/common/app-error` and replace each raw throw — 403 for `CANNOT_IMPERSONATE_SELF` / `CANNOT_IMPERSONATE_EQUAL_OR_HIGHER_GLOBAL_ROLE` / `TARGET_MUST_BE_TENANT_USER`, 404 for `TARGET_USER_NOT_FOUND` / `TARGET_NOT_MEMBER_OF_TENANT`.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Target-user mapping uses `as any` casts and no Safe schema** — The `targetUser` object handed to `UserSessionService.createImpersonationSession` casts `userRole`/`userStatus` with `as any` and is assembled inline from a raw `UserEntity` rather than passing it through a `SafeUser`/Safe* schema. This bypasses the typed-boundary guarantee and could leak unexpected entity shape across the service boundary. Evidence: `modules/auth_impersonation/impersonation.service.ts:64-65`, `:134-135`. Rule: `validation-philosophy.md`. Fix: parse `targetUser` through `SafeUserSchema` (or build it via a typed mapper) and drop the `as any` casts.
- **[Dimension 2 — Boundary validation] Metadata accessed via untyped `as any`** — `getActiveImpersonationSession` reads `(session.metadata as any)?.impersonation`, an ad-hoc untyped property probe to decide whether a session is an impersonation. Evidence: `modules/auth_impersonation/impersonation.service.ts:187`. Rule: `zod-validation.md`. Fix: model the session metadata with a typed schema (e.g. an `ImpersonationMeta` Zod object) and read the flag from the parsed shape; the final return is already correctly run through `SafeUserSessionSchema.parse` (`:190`).

### 🔵 Low
- **[Dimension 4 — Messages pattern] Unused / drifting message keys** — `impersonation.messages.ts` defines `NOT_IMPERSONATING`, `CANNOT_REFRESH_IMPERSONATION_SESSION`, and `INSUFFICIENT_PRIVILEGES` that are never referenced by the service, and `GLOBAL_ROLE_ORDER` is a hardcoded inline literal rather than sourced from the role enum. Not user-facing strings, so minor. Evidence: `modules/auth_impersonation/impersonation.messages.ts:9-11`, `impersonation.service.ts:16`. Rule: `module-messages-pattern.md`. Fix: prune unused keys and derive `GLOBAL_ROLE_ORDER` from the canonical global-role enum.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `default class ImpersonationService` with only static methods; never instantiated. |
| 2 | Boundary validation | ⚠️ | DTOs validated at route via Zod; final return uses `SafeUserSessionSchema.parse` (`:190`), but target-user mapping uses `as any` and metadata is read untyped (`:64,134,187`). |
| 3 | Error handling | ❌ | Six raw `throw new Error(...)` instead of `AppError` (`:45,116,122,125,195,203`); side-effect audit logs are fire-and-forget. |
| 4 | Messages pattern | ✅ | All thrown strings sourced from `impersonation.messages.ts`; no inline user-facing literals. Unused keys noted as Low. |
| 5 | DB access & entity ownership | ✅ | DB touched only in service; `findOne` results null-checked (`:45,116,122`); no raw SQL; reads only, no multi-write transaction needed. |
| 6 | Multi-tenancy | ✅ | `TenantMember` queries use `tenantDataSourceFor(tenantId)` and filter by `tenantId` (`:51-54,118-121`); system-wide `User`/`UserSession` correctly use `getDataSource()`. |
| 7 | Authorization / RBAC | ✅ | Real in-service resource-level checks: `assertNotSelf`, `assertGlobalRoleDominance`, and `TARGET_MUST_BE_TENANT_USER` gate (`:41,47,112,124`). Strength of this module. |
| 8 | Service composition & boundaries | ✅ | Composes `UserSessionService`/`AuditLogService` via facades and `@/` alias; no sub-service cross-imports or cycles. |
| 9 | Caching | — | No hot read path requiring cache; `getActiveImpersonationSession` is a single token lookup. N/A. |
| 10 | Secrets & config | ✅ | No `process.env` reads; no secret handling in service (token hashing delegated to UserSessionService). |
| 11 | Logging & audit | ✅ | Start/end actions audit-logged fire-and-forget (`:79,149,168`); metadata carries no secrets (tokens never logged). |
| 12 | Security hardening | ✅ | Privilege-dominance + self-impersonation guards; tokens hashed before lookup (`:180`); expiry checked (`:188`); no injection surface. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase class, `.service.ts`/`.dto.ts`/`.messages.ts` suffixes correct. |

## Recommendations
1. **(High)** Replace all six raw `throw new Error(...)` with `AppError(message, statusCode, ErrorCode.X)` — 403 for privilege/self guards, 404 for missing target/membership — so impersonation denials surface correct HTTP statuses.
2. **(Medium)** Map the target user through `SafeUserSchema` and remove the `as any` casts at `:64-65` and `:134-135`.
3. **(Medium)** Introduce a typed `ImpersonationMeta` schema and read `metadata.impersonation` from the parsed shape instead of `(session.metadata as any)` at `:187`.
4. **(Low)** Prune unused message keys and derive `GLOBAL_ROLE_ORDER` from the canonical global-role enum.

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `zod-validation.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `module-messages-pattern.md` · Source: `modules/auth_impersonation/impersonation.service.ts`, `impersonation.dto.ts`, `impersonation.messages.ts`, `module.json`
