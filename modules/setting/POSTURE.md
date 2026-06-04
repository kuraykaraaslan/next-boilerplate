# setting — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `setting.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `setting.service.ts` | 188 | Tenant-scoped key/value settings store: read (single/many/all/by-group), upsert (create/update/updateMany), delete, plus a Redis read-through cache layer with per-key and "all" invalidation. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — `update()` throws a plain `Error` when the setting is absent, so a route handler cannot derive an HTTP status (defaults to 500 instead of 404). Evidence: `modules/setting/setting.service.ts:119`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(SettingMessages.SETTING_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` importing from `@/modules/common/app-error`.

### 🟡 Medium
- **[Dimension 5 — DB access / transactions] Multi-write `updateMany` is not transactional** — the loop performs `findOne`/`update`/`insert` per key with no surrounding transaction, so a mid-loop failure leaves a partially-applied batch and an inconsistent return value. Evidence: `modules/setting/setting.service.ts:135-149`. Rule: `database-patterns.md`. Fix: wrap the batch in `ds.transaction(...)` (or `queryRunner`) and `parse`/cache only after commit.
- **[Dimension 5 — DB access] Non-atomic read-then-write upserts** — `create()` and `update()` do `findOne` then a separate `update`/`insert`, racing concurrent writers on the same `(tenantId,key)`. Evidence: `modules/setting/setting.service.ts:99-107`, `:118-121`. Rule: `database-patterns.md`. Fix: use a single `repo.upsert({...}, ['tenantId','key'])` (the entity has a composite PK) to make the write atomic.

### 🔵 Low
- **[Dimension 2 — Boundary validation] Schema/entity drift on `updatedAt`** — `SettingSchema` declares `updatedAt: z.date().nullable()` while the entity's `@UpdateDateColumn` is always populated, so the nullable branch is dead and slightly weakens the output contract. Evidence: `modules/setting/setting.types.ts:15`, `entities/setting.entity.ts:25-26`. Rule: `validation-philosophy.md`. Fix: make `updatedAt` non-nullable to match the entity.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class of only static methods, single `export default`, never instantiated. |
| 2 | Boundary validation | ⚠️ | All DB output passed through `SettingSchema.parse`; minor `updatedAt` nullability drift (Low). |
| 3 | Error handling | ❌ | Raw `throw new Error` at `:119` instead of `AppError` with statusCode/ErrorCode. |
| 4 | Messages pattern | ✅ | Uses `setting.messages.ts`; `'general'`/`'string'` are config defaults, not user-facing strings. |
| 5 | DB access / entity ownership | ⚠️ | DB only in service, entity in `entities/`, null-checked, no raw SQL; but `updateMany` non-transactional and upserts non-atomic (Medium). |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters `where: { tenantId, ... }`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service authz; trusts `tenantId` arg — authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition / boundaries | ✅ | No sub-service cycles; cross-module key schemas re-exported via `@/` alias in `setting.types.ts`. |
| 9 | Caching | ✅ | Read-through Redis cache with per-key + "all" invalidation; `getFromCache`/`setCache` correctly fail open (swallow errors). |
| 10 | Secrets and config | ✅ | No `process.env.X` reads; Redis via `@/modules/redis`, DataSource via `@/modules/db`. |
| 11 | Logging and audit | ⚠️ | Mutating ops (create/update/updateMany/delete) are not audit-logged; acceptable for low-sensitivity KV but noted. |
| 12 | Security hardening | ✅ | No SSRF/injection surface; parameterized repo queries; no secret leakage in errors. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase class, entity under `entities/`. |

## Recommendations
1. **(High)** Replace the raw `Error` at `setting.service.ts:119` with `AppError(message, 404, ErrorCode.NOT_FOUND)` from `@/modules/common/app-error`.
2. **(Medium)** Wrap `updateMany` in a single `ds.transaction(...)` so the batch is all-or-nothing.
3. **(Medium)** Convert `create`/`update` read-then-write logic to `repo.upsert(..., ['tenantId','key'])` to eliminate the race on the composite PK.
4. **(Low)** Tighten `SettingSchema.updatedAt` to non-nullable to match the entity.
5. Consider fire-and-forget audit logging on mutations if settings ever hold security-relevant values.

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `validation-philosophy.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md` · Source: `modules/setting/setting.service.ts`, `setting.types.ts`, `setting.messages.ts`, `setting.dto.ts`, `entities/setting.entity.ts`
</content>
</invoke>
