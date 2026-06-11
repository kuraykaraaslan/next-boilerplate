> **Uygulandı** — 2026-06-10: All 7 raw Error throws → AppError (404 NOT_FOUND, 409 CONFLICT, 400 VALIDATION_ERROR). Note: getByEmail bcrypt-hash-in-cache fix requires caller refactoring — deferred.

# user — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** user.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 3m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| modules/user/user.service.ts | 177 | System-wide user CRUD: create/getAll/getById/update/delete/getByEmail, password hashing, Redis caching with single-flight + negative cache, platform webhook dispatch. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — Every failure path throws `new Error(UserMessages.X)`, so a route handler cannot derive an HTTP status (404 vs 409 vs 400) and clients get an opaque 500. Evidence: `modules/user/user.service.ts:31` (`INVALID_EMAIL`), `:37` (`EMAIL_ALREADY_EXISTS`), `:38` (`INVALID_PASSWORD`), `:97` (`USER_NOT_FOUND`), `:106` (`USER_NOT_FOUND`), `:110` (`USER_NOT_FOUND`), `:146` (`USER_NOT_FOUND`). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw with explicit status (e.g. `new AppError(UserMessages.USER_NOT_FOUND, 404, ErrorCode.NOT_FOUND)`, `EMAIL_ALREADY_EXISTS` → 409, validation msgs → 400).
- **[Dimension 12 — Security hardening] Password hash written to Redis** — `getByEmail` parses the full `User` (including the bcrypt `password`, present in `UserSchema` but omitted by `SafeUserSchema`) and caches the serialized object in Redis under `user:email:*`. Evidence: `modules/user/user.service.ts:172-173` (`UserSchema.parse(user)` then `redis.setex(..., JSON.stringify(parsed))`); schema contrast at `modules/user/user.types.ts:14` (password in `UserSchema`) vs `:23` (`SafeUserSchema.omit({ password: true })`). Rule: `security-hardening.md`. Fix: cache only the fields auth needs, or store a `SafeUser` plus a separately-scoped credential lookup; never persist the bcrypt hash in the cache layer.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Ad-hoc `if/else` validation inside the service** — `create`/`update` re-validate already-typed input with imperative guards instead of trusting the Zod-validated boundary input. Evidence: `modules/user/user.service.ts:31` (`if (!email)`), `:38` (`if (!password)`), `:106` (`if (!userId)`). Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: validate the request schema at the route with `safeParse`; drop the in-service presence checks (keep only the DB-state check `EMAIL_ALREADY_EXISTS`).
- **[Dimension 5 — DB access] Multi-write side-effects not transactional / read-after-write race** — `update` issues `repo.update(...)` then a separate `repo.findOne(...)` (lines 112-118) and `create` does `findOne`-then-`save` (lines 36-48) without a transaction, leaving a TOCTOU window on the unique-email check and a non-atomic update+reload. Evidence: `modules/user/user.service.ts:36-48`, `:112-118`. Rule: `database-patterns.md`. Fix: wrap update+reload in `ds.transaction(...)`; rely on the DB unique constraint (catch the violation) rather than the pre-check race in `create`.
- **[Dimension 11 — Logging and audit] No audit-log entry for privileged mutations** — `create`/`update`/`delete` dispatch webhook events but record no audit-log entry for these privileged actions (role changes, suspension, account deletion). Evidence: `modules/user/user.service.ts:50-54`, `:125-137`, `:149-152`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: add a fire-and-forget audit-log write (actor, target userId, action, before/after role/status) alongside the webhook dispatch.

### 🔵 Low
- **[Dimension 2 — Boundary validation] `as any` cast on `where` conditions** — `getAll` casts `whereConditions as any` to satisfy `find`/`count`, weakening type safety on the query shape. Evidence: `modules/user/user.service.ts:80-81`. Rule: `code-structure-ts-master.md`. Fix: type `whereConditions` as `FindOptionsWhere<UserEntity>[]` and drop the casts.
- **[Dimension 9 — Caching] `getAll` list path is uncached** — The paginated list read has no cache while single-entity reads do; acceptable for a low-traffic admin listing but inconsistent. Evidence: `modules/user/user.service.ts:79-82`. Rule: `caching-patterns.md`. Fix: optional — leave uncached, or add a short-TTL cache keyed by page/search if it becomes hot.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Class, only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Output filtered via `SafeUserSchema`/`UserSchema`, but ad-hoc `if (!x)` guards and `as any` on `where` deviate. |
| 3 | Error handling | ❌ | 7 raw `throw new Error(...)` — no `AppError`/status/`ErrorCode`. |
| 4 | Messages pattern | ✅ | All user-facing strings from `user.messages.ts`; no inline literals in the service. |
| 5 | DB access and entity ownership | ⚠️ | Entity under `entities/`, null-checked after `findOne`, no raw SQL; but update+reload and create check are non-transactional. |
| 6 | Multi-tenancy | ✅ | `users` is system-wide (no tenantId column); correctly uses `getDataSource()`, not `tenantDataSourceFor`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service resource-level check; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition and boundaries | ✅ | `WebhookService` imported via `@/` facade; no sub-service cross-imports or cycles. |
| 9 | Caching | ⚠️ | Single reads use single-flight + jittered TTL + negative cache + fail-open; list read uncached; hash cached (see Dim 12). |
| 10 | Secrets and config | ✅ | TTL via `env.SESSION_CACHE_TTL`; no `process.env` in the service. |
| 11 | Logging and audit | ❌ | Webhooks dispatched but no audit-log entry for create/update/delete. |
| 12 | Security hardening | ⚠️ | bcrypt cost 10, email normalized; but bcrypt hash is serialized into Redis via `getByEmail`. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/`.service.ts` files, PascalCase `UserService`, correct suffixes. |

## Recommendations
1. Replace all 7 raw `throw new Error(...)` with `AppError(message, statusCode, ErrorCode.X)` so routes return correct HTTP codes (404 not-found, 409 conflict, 400 validation).
2. Stop caching the bcrypt hash: have `getByEmail` cache a `SafeUser` shape, or isolate the credential lookup so the password hash never lands in Redis.
3. Add fire-and-forget audit-log writes for create/update/delete (especially role and status transitions and account deletion).
4. Wrap `update` (update+reload) in `ds.transaction(...)` and rely on the DB unique constraint in `create` to close the email race; remove the redundant `if (!email)`/`if (!password)`/`if (!userId)` guards in favor of route-level Zod validation.
5. Minor: type `whereConditions` as `FindOptionsWhere<UserEntity>[]` to drop the `as any` casts.

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `zod-validation.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `authorization-and-rbac.md`, `caching-patterns.md`, `security-hardening.md`, `logging-monitoring-and-audit-trails.md`, `env-and-config.md`, `naming-conventions.md` · Source: `modules/user/user.service.ts`, `modules/user/user.types.ts`, `modules/user/user.enums.ts`, `modules/user/user.messages.ts`, `modules/user/entities/user.entity.ts`, `modules/user/user.dto.ts`
</content>
</invoke>
