> **Uygulandı** — 2026-06-10: Added user_preferences.messages.ts, all 3 raw Error throws → AppError (409 CONFLICT, 404 NOT_FOUND), removed data as any → Object.assign with UserPreferencesSchema.partial().parse(data), update/upsert use repo.save() instead of repo.update()+findOne.

# user_preferences — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `user_preferences.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `user_preferences.service.ts` | 94 | CRUD + upsert + get-or-create for per-user UI/notification preferences, with Redis read-through cache keyed by `userId`. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — Three service throws use `throw new Error(...)`, so a route handler cannot derive an HTTP status (409 conflict vs 404 not-found are indistinguishable). Evidence: `modules/user_preferences/user_preferences.service.ts:39` (`'Preferences already exist for this user'`), `:51` and `:82` (`'Preferences not found'`). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from '@/modules/common/app-error'` and throw `new AppError(Messages.X, 409, ErrorCode.CONFLICT)` for the already-exists case and `new AppError(Messages.X, 404, ErrorCode.NOT_FOUND)` for the not-found cases.

### 🟡 Medium
- **[Dimension 4 — Messages pattern] Hardcoded inline user-facing strings** — Error prose is hardcoded in the service rather than sourced from a `user_preferences.messages.ts`; the module has no messages file. Evidence: `modules/user_preferences/user_preferences.service.ts:39,51,82`. Rule: `module-messages-pattern.md`. Fix: add `user_preferences.messages.ts` and reference `Messages.PREFERENCES_ALREADY_EXIST` / `Messages.PREFERENCES_NOT_FOUND`.
- **[Dimension 2 — Boundary validation] `update`/`upsert` payload reaches the DB untyped via `as any`** — `repo.update({ userId }, data as any)` bypasses the typed `Partial<UserPreferences>` contract and any narrowing; an untrusted caller field set could be written. Evidence: `modules/user_preferences/user_preferences.service.ts:53,65`. Rule: `validation-philosophy.md`. Fix: validate the partial with a dedicated partial schema (e.g. `UserPreferencesSchema.partial()`) before persisting, and drop the `as any`. Output filtering through `UserPreferencesSchema.parse(...)` is correctly applied on every read/write path.
- **[Dimension 5 — DB access / transactions] Non-atomic update-then-reload** — `update` and `upsert` do `repo.update(...)` followed by a separate `repo.findOne(...)`; between the two statements a concurrent delete/update can race, and the reload (`updated!`) is non-null-asserted. Evidence: `modules/user_preferences/user_preferences.service.ts:53-56,65-68`. Rule: `database-patterns.md`. Fix: wrap the read-modify-write in a transaction (or use `repo.save()` of a merged entity) and null-check the reload instead of `!`.

### 🔵 Low
- **[Dimension 10 — Secrets & config] TTL key reuse** — `USER_PREFERENCES_CACHE_TTL` reuses `env.SESSION_CACHE_TTL`, semantically a session TTL not a preferences TTL. Evidence: `modules/user_preferences/user_preferences.service.ts:8`. Rule: `env-and-config.md`. Fix: add a dedicated `USER_PREFERENCES_CACHE_TTL` env key for clarity (config is still Zod-validated via `@/modules/env`, so this is cosmetic).

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class`, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | Output filtered via `UserPreferencesSchema.parse` everywhere; but `update`/`upsert` persist `data as any`. |
| 3 | Error handling | ❌ | Raw `throw new Error(...)` at :39/:51/:82; cache side-effects correctly fail-open. |
| 4 | Messages pattern | ❌ | No `.messages.ts`; error strings hardcoded inline at :39/:51/:82. |
| 5 | DB access & entities | ⚠️ | DB confined to service, entity in `entities/`, null-checks present; but non-atomic update-then-reload, no transaction. |
| 6 | Multi-tenancy | ✅ | User-scoped system-wide entity (no `tenantId` column); correctly uses `getDataSource()`, keyed by `userId`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service ownership check; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | No sub-services; only `@/`-aliased cross-module imports (`db`, `redis`, `env`). |
| 9 | Caching | ✅ | Read-through with `singleFlight`, `jitter`ed TTL, negative cache, fail-open `.catch`, cache invalidation on writes. |
| 10 | Secrets & config | ⚠️ | TTL via `@/modules/env` (no `process.env.X`); but reuses `SESSION_CACHE_TTL` for a non-session concern. |
| 11 | Logging & audit | — | No audit log; per-user preference changes are low-sensitivity, not an auditable security action. N/A. |
| 12 | Security hardening | ✅ | No SSRF/injection surface; cache keys are server-side `userId`; no raw SQL. |
| 13 | Naming & organization | ✅ | snake_case module, `<module>.<suffix>.ts` files, PascalCase class, entity under `entities/`. |

## Recommendations
1. Replace all three `throw new Error(...)` with `AppError` carrying explicit `statusCode` + `ErrorCode` (409/CONFLICT for create-conflict, 404/NOT_FOUND for missing) — closes the only High.
2. Add `user_preferences.messages.ts` and route the new `AppError` messages through it.
3. Remove `data as any`; validate the partial payload with `UserPreferencesSchema.partial()` before `repo.update`.
4. Make `update`/`upsert` atomic (transaction or merged `repo.save`) and null-check the reload instead of `updated!`.
5. (Optional) Introduce a dedicated `USER_PREFERENCES_CACHE_TTL` env key instead of reusing `SESSION_CACHE_TTL`.

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `validation-philosophy.md`, `database-patterns.md`, `multi-tenancy-patterns.md`, `caching-patterns.md`, `authorization-and-rbac.md`, `env-and-config.md` · Source: `modules/user_preferences/user_preferences.service.ts`
