> **Uygulandı** — 2026-06-10: All 4 raw Error throws → AppError (404 TENANT_NOT_FOUND) in tenant.service.ts; tenant.deletion.service.ts inline 'Tenant not found' literal → TenantMessages.TENANT_NOT_FOUND via AppError.

# tenant — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** tenant.service.ts, tenant.deletion.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 3l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| tenant.service.ts | 217 | Tenant CRUD (list/get/create/update/soft-delete), cache, default seeding, webhook dispatch |
| tenant.deletion.service.ts | 61 | Soft-deletion lifecycle: request (30-day grace), cancel, purge expired tenants |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error` instead of `AppError`** — Four service throws use a raw `Error`, so a route handler cannot derive an HTTP status or stable `ErrorCode`. A dedicated `ErrorCode.TENANT_NOT_FOUND` already exists in `modules/common/app-error.ts` and is unused. Evidence: `modules/tenant/tenant.service.ts:89`, `modules/tenant/tenant.service.ts:164`, `modules/tenant/tenant.service.ts:209`, `modules/tenant/tenant.deletion.service.ts:15`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND)`.

### 🟡 Medium
- **[Dimension 4 — Messages pattern] Hardcoded inline user-facing string** — `requestDeletion` throws the literal `'Tenant not found'` instead of referencing the module messages file (`TenantMessages.TENANT_NOT_FOUND`). Evidence: `modules/tenant/tenant.deletion.service.ts:15`. Rule: `module-messages-pattern.md`. Fix: import `TenantMessages` and use `TenantMessages.TENANT_NOT_FOUND`.
- **[Dimension 11 — Logging and audit] No audit trail for tenant lifecycle** — create/update/delete and deletion request/cancel/purge are high-value platform actions but only emit webhooks and `Logger.info`; no fire-and-forget audit-log entry is written (other modules in the repo use an audit service). Evidence: `modules/tenant/tenant.service.ts:97-115`, `modules/tenant/tenant.service.ts:205-216`, `modules/tenant/tenant.deletion.service.ts:21-26`, `modules/tenant/tenant.deletion.service.ts:55-57`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit record (actor, tenantId, action) on each lifecycle mutation.

### 🔵 Low
- **[Dimension 6 — Multi-tenancy] System entity read through `tenantDataSourceFor`** — `tenants` is a system-wide entity (per repo convention it belongs on the system DataSource), but `getById`/`update`/`delete` route through `tenantDataSourceFor(tenantId)`. There is no isolation risk because every query is filtered by the `tenantId` primary key and `tenantDataSourceFor` falls back to the base DataSource, but it is an inconsistent DataSource choice vs `getAll`/`create`/`provisionPersonal` which correctly use `getDataSource()`. Evidence: `modules/tenant/tenant.service.ts:87`, `:161`, `:206`; cf. `modules/tenant/tenant.deletion.service.ts:12` vs `:41`. Rule: `multi-tenancy-patterns.md`. Fix: use `getDataSource()` consistently for the system-scoped `tenants` table.
- **[Dimension 2 — Boundary validation] `as any` casts at the repo query/write boundary** — `repo.create(... as any)`, `repo.save(...) as unknown as TenantEntity`, `repo.update({ tenantId }, data as any)` and the `where: whereConditions as any` read filter bypass TypeORM typing. Input is Zod-validated and output is parsed through `SafeTenantSchema`, so this is a typing-discipline deviation rather than a safety hole. Evidence: `modules/tenant/tenant.service.ts:101-102`, `:166` (writes), `:72-73` (read filter). Rule: `validation-philosophy.md`. Fix: type the create/update payloads to `DeepPartial<TenantEntity>` and the where clause to `FindOptionsWhere<TenantEntity>[]` to drop the casts.
- **[Dimension 5 — DB access] `update` then re-`findOne` without a transaction** — `update()` performs an UPDATE followed by a separate SELECT and emits webhooks based on the second read; not wrapped in a transaction. Low impact (single-row, non-financial), but a concurrent write could be observed. Evidence: `modules/tenant/tenant.service.ts:166-183`. Rule: `database-patterns.md`. Fix: use `repo.save()` on the loaded entity, or wrap update+read in a transaction.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Both are `default class` with only static methods; never instantiated. |
| 2 | Boundary validation | ⚠️ | Zod DTO input + `SafeTenantSchema` output parsing present; `as any` casts at write boundary. |
| 3 | Error handling | ❌ | 4× raw `throw new Error`; `ErrorCode.TENANT_NOT_FOUND` exists but unused. |
| 4 | Messages pattern | ⚠️ | tenant.service uses `TenantMessages`; deletion service has one inline literal string. |
| 5 | DB access / entity ownership | ⚠️ | Entities in `entities/`, null-checks after findOne; update+read not transactional. |
| 6 | Multi-tenancy | ⚠️ | All queries PK-filtered by `tenantId`; system `tenants` table read via `tenantDataSourceFor` inconsistently. No isolation risk. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource-level checks; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | Cross-module deps via facades + `@/` alias (`WebhookService`, `SettingService`, dynamic imports); no sub-service cross-imports. |
| 9 | Caching | ✅ | `getById` uses singleFlight + jittered TTL + fail-open `.catch`; clearCache on mutate. |
| 10 | Secrets and config | ✅ | `TENANT_CACHE_TTL` via Zod-validated `@/modules/env`; no `process.env` in services. |
| 11 | Logging and audit | ❌ | Lifecycle mutations not audit-logged (webhooks + `Logger.info` only). |
| 12 | Security hardening | ✅ | `ILike` search via TypeORM params (no injection); soft-delete + grace period; no risky crypto/SSRF surface. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab/dotted files, PascalCase classes, correct `.service.ts` suffixes. |

## Recommendations
1. Replace all four `throw new Error(...)` with `throw new AppError(TenantMessages.TENANT_NOT_FOUND, 404, ErrorCode.TENANT_NOT_FOUND)` (High).
2. Use `TenantMessages.TENANT_NOT_FOUND` in `tenant.deletion.service.ts:15` instead of the inline literal (Medium).
3. Add fire-and-forget audit-log entries for create/update/delete and deletion request/cancel/purge (Medium).
4. Standardize on `getDataSource()` for the system-scoped `tenants` table in `getById`/`update`/`delete`; drop the `as any` write casts (Low).
5. Wrap `update`'s UPDATE + re-read in a transaction or use entity `save()` (Low).

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `logging-monitoring-and-audit-trails.md`, `multi-tenancy-patterns.md`, `validation-philosophy.md`, `database-patterns.md`, `authorization-and-rbac.md`, `caching-patterns.md`, `env-and-config.md` · Source: `modules/tenant/tenant.service.ts`, `modules/tenant/tenant.deletion.service.ts`
