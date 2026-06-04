# scim — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `scim.service.ts`
> **Overall grade:** C · **Findings:** 0c / 2h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `scim.service.ts` | 408 | SCIM 2.0 (RFC 7643/7644) provisioning bridge — maps `ScimUser` onto `User` + `TenantMember` (list/get/create/update/patch/delete users, stubbed groups). |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `new Error` + monkey-patched `.status`/`.scimType` instead of `AppError`** — Every error path throws `new Error(ScimMessages.X)` and then mutates `(err as any).status` / `(err as any).scimType`. A route handler cannot reliably derive an HTTP status or error code from a raw `Error`, and the bolted-on `any` properties bypass the typed `AppError` contract (`statusCode` + `ErrorCode`). Evidence: `modules/scim/scim.service.ts:92-95` (invalid filter), `:170-172` (get not found), `:188-191` (username required), `:217-220` (already exists), `:250-252` / `:259-261` (update not found), `:300-302` / `:309-311` (patch not found), `:349-352` (invalid patch path), `:378-380` (delete not found). Rule: `error-handling-and-app-error.md`. Fix: throw `new AppError(message, statusCode, ErrorCode.X)` from `@/modules/common/app-error`. Map SCIM semantics onto `ErrorCode` (`NOT_FOUND` 404, `CONFLICT` 409, `VALIDATION_ERROR` 400) and carry the `scimType` either via an `AppError` subclass or by translating `ErrorCode`→`scimType` in the route error-mapper, not via `any` property mutation.
- **[Dimension 2 — Boundary validation] DB output not filtered through a `Safe*Schema`** — `toScimUser` hand-builds the response object and reads off-entity fields via `(user as any).givenName` / `(user as any).familyName` (the `User` entity declares neither column); the result is returned directly without ever being parsed through `ScimUserSchema` (which exists in `scim.types.ts:50`). Output is therefore unvalidated and the `as any` casts defeat type safety. Evidence: `modules/scim/scim.service.ts:61-79` (esp. `:62-63`, returns at `:64-78`), schema available at `modules/scim/scim.types.ts:50-61`. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: return `ScimUserSchema.parse(...)` and replace the `as any` name reads with declared, typed access (or drop them until the `User` entity grows the fields, as the PATCH no-op branch at `:342-347` already anticipates).

### 🟡 Medium
- **[Dimension 11 — Logging/audit] Create flow's cross-tenant `User` row creation is not audited** — `createUser` may mint a brand-new global `User` (`modules/scim/scim.service.ts:203-209`) but only audit-logs the `tenant_member` creation (`:232-239`). Creation of a system-wide identity from an external IdP is a security-relevant event that leaves no trail of its own. Evidence: `modules/scim/scim.service.ts:198-210` vs the single audit at `:232-239`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit an audit entry when a new `User` is provisioned (or include a `userCreated: true` flag in the existing metadata).
- **[Dimension 5 — DB access / transactions] Multi-write create/update/patch not wrapped in a transaction** — `createUser` saves a `User` (system DS) then a `TenantMember` (tenant DS) as two independent writes (`modules/scim/scim.service.ts:209`, `:230`); `updateUser`/`patchUser` likewise persist `user` and `member` separately (`:275`+`:280`, `:357`+`:358`). A failure between the two leaves a partially-provisioned state (orphan `User`, or email updated without member, or vice-versa). The two datasources (system vs tenant) make a single ACID transaction non-trivial, but the ordering currently offers no compensation. Evidence: `modules/scim/scim.service.ts:209` / `:230`, `:275` / `:280`, `:357` / `:358`. Rule: `database-patterns.md`. Fix: where both writes hit the tenant DS, use a `queryRunner` transaction; for the cross-DS create, save the member first or add idempotent reconciliation so a half-write is self-healing on retry (IdPs retry).
- **[Dimension 3 — Error handling] Audit-log side-effects are awaited, not fire-and-forget** — Audit writes are `await`ed inline (`modules/scim/scim.service.ts:232`, `:282`, `:360`, `:388`); a failure in the non-critical audit path would reject the whole SCIM operation rather than being silently caught. Rule: `error-handling-and-app-error.md` (non-critical side-effects silently caught). Fix: dispatch audit logging fire-and-forget with a swallowed/`.catch` handler, consistent with the fire-and-forget audit convention.

### 🔵 Low
- **[Dimension 2 — Boundary validation] `listUsers` re-clamps already-validated pagination** — `ListScimUsersDTO` already enforces `startIndex >= 1` and `count` 0–200 (`scim.dto.ts:29-30`), yet the service re-derives bounds with `Math.max`/`Math.min` and a `?? DEFAULT` fallback (`modules/scim/scim.service.ts:102-103`). Note `MAX_COUNT` (200) here vs the DTO's `.max(200)` — consistent today but two sources of truth. Rule: `validation-philosophy.md` (service trusts typed input). Fix: trust the parsed DTO; drop the redundant clamping or keep a single source for the max.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | `export default class ScimService` with only static methods; never instantiated. |
| 2 | Boundary validation | ⚠️ | Input DTOs (Zod) exist and are parsed at the route; output is NOT run through `ScimUserSchema`, and `(user as any)` reads bypass typing. |
| 3 | Error handling | ❌ | Every throw is a raw `new Error` with `any`-patched `.status`; audit side-effects awaited not fire-and-forget. |
| 4 | Messages pattern | ✅ | All strings sourced from `scim.messages.ts`; no inline user-facing literals (one interpolated `path` suffix at `:349` is acceptable). |
| 5 | DB access / entities / tx | ⚠️ | DB only in service, null-checks after `findOne`, no raw SQL; but cross-write create/update/patch lack a transaction. |
| 6 | Multi-tenancy | ✅ | `TenantMember` via `tenantDataSourceFor(tenantId)` with `tenantId` in where + `member.tenantId !== tenantId` defense; `User` correctly system-scoped via `getDataSource()`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service authz; bearer/scope enforced at route layer (deviation from authorization-and-rbac.md). Tenant isolation intact. |
| 8 | Service composition / boundaries | ✅ | Uses `@/` alias, calls `AuditLogService` facade and `@/modules/db`; no sub-service cross-imports or cycles. |
| 9 | Caching | — | N/A — SCIM provisioning is low-volume write path; no hot read requiring cache. |
| 10 | Secrets / config | ✅ | No `process.env` reads; `bcrypt`/`crypto` used directly with no secret material from config in service. |
| 11 | Logging / audit | ⚠️ | Member CRUD audited, but new cross-tenant `User` creation is not audited; no secret leakage in log lines. |
| 12 | Security hardening | ✅ | Filter parsed via anchored regex (no injection), `eq`-only allowlist, throwaway password is random 32-byte + bcrypt(10), email lowercased; pagination capped. |
| 13 | Naming / file organization | ✅ | `scim` snake module, kebab files, `ScimService` PascalCase, correct `.service.ts`/`.dto.ts`/`.types.ts`/`.messages.ts` suffixes. |

## Recommendations
1. Replace all raw `new Error(...)` throws with `AppError(message, statusCode, ErrorCode.X)`; translate SCIM `scimType` in the route error-mapper instead of mutating `any` properties (Dimension 3, High).
2. Parse outgoing resources through `ScimUserSchema` and remove the `(user as any).givenName/familyName` casts (Dimension 2, High).
3. Make audit logging fire-and-forget (swallow failures) and add an audit entry when a new global `User` is provisioned (Dimensions 3 & 11).
4. Wrap same-datasource writes in a transaction and reorder/reconcile the cross-datasource create so IdP retries cannot leave a half-provisioned state (Dimension 5).
5. Trust the validated `ListScimUsersInput` and drop redundant pagination clamping in `listUsers` (Dimension 2, Low).

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `zod-validation.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `security-hardening.md`, `module-messages-pattern.md`, `code-structure-ts-master.md`, `naming-conventions.md` · Source: `modules/scim/scim.service.ts`, `scim.types.ts`, `scim.dto.ts`, `scim.messages.ts`, `scim.errors.ts`, `modules/tenant_member/entities/tenant_member.entity.ts`, `modules/common/app-error.ts`
</content>
</invoke>
