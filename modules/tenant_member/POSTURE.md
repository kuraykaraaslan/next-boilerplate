# tenant_member — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `tenant_member.service.ts`
> **Overall grade:** D · **Findings:** 1c / 1h / 2m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `tenant_member.service.ts` | 160 | CRUD + pagination/search for tenant memberships, role hierarchy (`hasRole`/`checkPermission`), last-owner / demote-owner protection, webhook dispatch on member lifecycle events. |

## Findings

### 🔴 Critical
- **[Dimension 6 — Multi-tenancy] Tenant-scoped reads/writes missing `tenantId` filter** — `getById`, `update`, and `delete` resolve a `TenantMember` row by its globally-unique PK only (no `tenantId` scope) via the system `getDataSource()`. `tenant_members` is a tenant-scoped table (has `tenantId`, `@Unique(['tenantId','userId'])`), so the app-level `tenantId` predicate is the effective isolation boundary — and it is absent on these PK lookups. A caller passing a `tenantMemberId` belonging to another tenant reads (`getById`), mutates (`update`), or soft-deletes (`delete`) that foreign row. The route compensates with a hand-rolled `member.tenantId !== tenantId` check (`app/tenant/[tenantId]/api/members/[memberId]/route.ts:28,67,127`), but that mitigation lives outside the service contract; any other caller (or a forgotten check) yields a cross-tenant IDOR. Evidence: `modules/tenant_member/tenant_member.service.ts:56`, `:93`, `:120` (each `findOne({ where: { tenantMemberId, deletedAt: IsNull() } })`). Rule: `multi-tenancy-patterns.md`. Fix: require `tenantId` on these methods, add it to every `where`/`update`/`delete` predicate, and query through `tenantDataSourceFor(tenantId)`.

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error(...)` instead of `AppError`** — six service throws use `new Error(message)`; a route handler cannot derive an HTTP status/`ErrorCode` from these, so they surface as generic 500s (the route does `status: 500` for all errors). Evidence: `modules/tenant_member/tenant_member.service.ts:57` (`MEMBER_NOT_FOUND`), `:78` (`MEMBER_ALREADY_EXISTS`), `:94` (`MEMBER_NOT_FOUND`), `:101` (`CANNOT_DEMOTE_OWNER`), `:121` (`MEMBER_NOT_FOUND`), `:128` (`LAST_OWNER`). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw e.g. `new AppError(TenantMemberMessages.MEMBER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)`; `409 / ErrorCode.CONFLICT` for already-exists; `409 / ErrorCode.CONFLICT` (or `403 / FORBIDDEN`) for last-owner / demote-owner.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Output `Safe*Schema` bypassed for the joined `user`** — `getByTenantId` parses the member through `SafeTenantMemberSchema` but then appends the raw `UserEntity` via `user: userMap[member.userId] as any` after the parse, defeating the `SafeUserSchema` filter declared in `tenant_member.types.ts:25`. `SafeUserSchema` omits `password` (`user.types.ts:23`), so the cast risks leaking the password hash and other sensitive columns. Evidence: `modules/tenant_member/tenant_member.service.ts:49`. Rule: `validation-philosophy.md`. Fix: run the joined user through `SafeUserSchema.parse(...)` (or `select` only safe columns) instead of casting to `any`.
- **[Dimension 5 — DB access] Multi-write operation not wrapped in a transaction** — `update` performs `tenantRepo.update(...)` + `tenantRepo.increment(sessionVersion)` as two separate non-atomic writes, then re-`findOne`; a failure between them leaves the row updated but the session-version bump unapplied. `create`'s existence `findOne` + `save` is backstopped by the DB `@Unique(['tenantId','userId'])` constraint, so the transaction gap there is lower-risk. Evidence: `modules/tenant_member/tenant_member.service.ts:105`–`:106` (`update`), `:77`–`:81` (`create`). Rule: `database-patterns.md`. Fix: wrap the read-modify-write in `update` in `dataSource.transaction(...)`.

### 🔵 Low
- **[Dimension 13 — Naming / file organization] Unused message constants** — `INVALID_MEMBER_DATA` and `CANNOT_REMOVE_OWNER` are defined in `tenant_member.messages.ts:4`–`:5` but never referenced by the service (the delete path uses `LAST_OWNER`). Dead surface only; no rule is broken (the messages pattern is otherwise correctly followed). Rule: `module-messages-pattern.md`. Fix: remove or wire them up.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class` of static methods; never instantiated. |
| 2 | Boundary validation | ⚠️ | Inputs are typed DTOs; output `Safe*Schema` used, but joined `user` cast `as any`, bypassing `SafeUserSchema` (`:49`). |
| 3 | Error handling | ❌ | Six raw `throw new Error(...)`; never `AppError` (`:57,78,94,101,121,128`). |
| 4 | Messages pattern | ✅ | Uses `tenant_member.messages.ts`; no inline user-facing strings in the service. |
| 5 | DB access & entity ownership | ⚠️ | DB only in service, entity in `entities/`, null-checked after `findOne`, no raw SQL; but read-modify-write in `update` not transactional. |
| 6 | Multi-tenancy | ❌ | `getById`/`update`/`delete` query the tenant-scoped `TenantMember` by PK with no `tenantId` filter via system DS (Critical). `getByTenantId`/`getByTenantAndUser`/`create`/`checkPermission` are correctly scoped; `getUserTenants` is cross-tenant by design. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Service exposes `hasRole`/`checkPermission` helpers but does not self-gate mutations. |
| 8 | Service composition & boundaries | ✅ | Cross-module access via `WebhookService` facade and `@/` alias; user/tenant entities imported for read-join only. |
| 9 | Caching | — | Only a fire-and-forget `redis.del` invalidation in `update` (`:107`) that fails open; no hot read path is uncached. N/A. |
| 10 | Secrets & config | ✅ | No `process.env` access; no secrets handled. |
| 11 | Logging & audit | ⚠️ | Lifecycle events dispatched via webhooks (created/updated/deleted), but no audit-log write for these privileged role/status mutations. |
| 12 | Security hardening | ⚠️ | `ILike('%search%')` is parameterized (no injection); rate limiting handled at route. The missing tenant scope (Dim 6) is the real hardening gap. |
| 13 | Naming & file organization | ✅ | `snake_case` module, kebab/dot-suffixed files, `PascalCase` class. Minor: two unused message constants. |

## Recommendations
1. **(Critical) Scope `getById`/`update`/`delete` by `tenantId`.** Add a required `tenantId` parameter, include it in every `where`/`update` predicate, and query via `tenantDataSourceFor(tenantId)`, so cross-tenant isolation no longer depends on a route-level post-check.
2. **(High) Replace all six `throw new Error(...)` with `AppError`** carrying an explicit `statusCode` + `ErrorCode` (404 not-found / 409 conflict / 403 forbidden as appropriate).
3. **(Medium) Filter the joined `user` through `SafeUserSchema`** in `getByTenantId` instead of `as any`.
4. **(Medium) Wrap the read-modify-write sequence in `update` in a transaction.**
5. **(Low/Optional) Add fire-and-forget audit-log entries** for role/status changes and member removal; prune the two unused message constants.

## References
- Rules: `multi-tenancy-patterns.md`, `error-handling-and-app-error.md`, `validation-philosophy.md`, `database-patterns.md`, `authorization-and-rbac.md`, `module-messages-pattern.md` · Source: `modules/tenant_member/tenant_member.service.ts` (context: `tenant_member.dto.ts`, `tenant_member.types.ts`, `tenant_member.messages.ts`, `entities/tenant_member.entity.ts`, `modules/user/user.types.ts`, `app/tenant/[tenantId]/api/members/[memberId]/route.ts`)
</content>
</invoke>
