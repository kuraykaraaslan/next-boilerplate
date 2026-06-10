> **Uygulandı** — 2026-06-10: Added user_profile.messages.ts, all 6 raw Error throws → AppError (409 CONFLICT, 404 NOT_FOUND), socialLinks read-modify-write (addSocialLink/removeSocialLink/updateSocialLink) wrapped in ds.transaction(), update/upsert changed from repo.update()+findOne to Object.assign()+repo.save() eliminating non-null assertion.

# user_profile — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** user_profile.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| user_profile.service.ts | 142 | CRUD + upsert for a user's profile (name, bio, images, social links) keyed by `userId`; Redis read-through cache; social-link add/remove/update on a jsonb array. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — Six throw sites use `throw new Error(...)`, so a route handler cannot derive an HTTP status (the "profile not found" cases should be 404 / `ErrorCode.NOT_FOUND`, the "already exists" case 409 / `ErrorCode.CONFLICT`). All resolve to 500. Evidence: `modules/user_profile/user_profile.service.ts:39,58,97,106,119,132`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error";` and replace each with e.g. `throw new AppError(Messages.PROFILE_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` / `throw new AppError(Messages.PROFILE_EXISTS, 409, ErrorCode.CONFLICT)`.

### 🟡 Medium
- **[Dimension 4 — Messages pattern] Hardcoded inline user-facing strings; no `.messages.ts`** — User-facing error prose is embedded directly in the service (`'Profile already exists for this user'`, `'Profile not found'`), and the module has no `user_profile.messages.ts`. Evidence: `modules/user_profile/user_profile.service.ts:39,58,97,106,119,132`. Rule: `module-messages-pattern.md`. Fix: add `user_profile.messages.ts` and reference its keys.
- **[Dimension 5 — DB access] Read-modify-write on `socialLinks` jsonb without a transaction** — `addSocialLink` / `removeSocialLink` / `updateSocialLink` read the row, mutate the array in app memory, then `update(...)`. Concurrent calls lose updates (last writer wins). This is a multi-step write that should be transactional or use an atomic DB-side jsonb operation. Evidence: `modules/user_profile/user_profile.service.ts:102-141`. Rule: `database-patterns.md`. Fix: wrap the read+update in `ds.transaction(...)` with a row lock (or use a jsonb append/filter at the SQL level).
- **[Dimension 5 — DB access] Non-atomic existence check in `create` / `upsert`** — `create` does `findOne` then `save`; between the two a concurrent insert can violate the `userId` unique constraint and surface as a raw 500 instead of a clean 409. Evidence: `modules/user_profile/user_profile.service.ts:38-49,72-91`. Rule: `database-patterns.md`. Fix: prefer an `upsert`/`onConflict` write or catch the unique-violation and map to `ErrorCode.CONFLICT`.
- **[Dimension 11 — Logging and audit] No audit log on mutations** — `create`, `update`, `upsert`, `delete`, and the social-link mutators perform meaningful state changes with no fire-and-forget audit-log call. Evidence: `modules/user_profile/user_profile.service.ts:35-141`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit event (action + actor `userId`) after each successful mutation.

### 🔵 Low
- **[Dimension 2 — Boundary validation] Output schema is not a dedicated `Safe*Schema` and drops timestamps** — `UserProfileSchema` doubles as both the input shape and the DB-output filter, and omits `userProfileId` / `createdAt` / `updatedAt` that consumers may expect. The redundant `.nullable().nullable()` in the DTO (`user_profile.dto.ts:12-15`) is also dead. Evidence: `modules/user_profile/user_profile.types.ts:13-19`; `modules/user_profile/user_profile.dto.ts:12-15`. Rule: `validation-philosophy.md`. Fix: define an explicit `SafeUserProfileSchema` for output and clean up the duplicated `.nullable()` chains.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default-exported class, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | Output run through `UserProfileSchema.parse`, but no dedicated `Safe*Schema`; DTO has dead `.nullable().nullable()`. |
| 3 | Error handling | ❌ | Six `throw new Error(...)` instead of `AppError` with statusCode + ErrorCode. |
| 4 | Messages pattern | ⚠️ | Hardcoded inline strings; no `user_profile.messages.ts`. |
| 5 | DB access & entity ownership | ⚠️ | Entity in `entities/`, null-checked, no raw SQL; but jsonb read-modify-write and create existence-check are non-transactional. |
| 6 | Multi-tenancy | ✅ | System-wide entity (`user_profiles`, no `tenantId`); correctly uses `getDataSource()`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service authz; trusts caller `userId`. authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | No sub-service cross-imports; uses `@/` alias for db/redis/env. |
| 9 | Caching | ✅ | Read-through with `singleFlight`, `jitter` TTL, negative cache, fail-open on every redis call. |
| 10 | Secrets & config | ✅ | TTL via `env.SESSION_CACHE_TTL`; no `process.env` access. |
| 11 | Logging & audit | ❌ | No audit logging on create/update/delete/social-link mutations. |
| 12 | Security hardening | ✅ | URLs validated via `z.string().url()`; no SSRF/injection/crypto surface in this service. |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/suffix files, PascalCase class, entity under `entities/`. |

## Recommendations
1. Replace all six `throw new Error(...)` with `AppError` (404/`NOT_FOUND`, 409/`CONFLICT`) — restores correct HTTP semantics (High).
2. Add `user_profile.messages.ts` and reference its keys from the throw sites (Medium).
3. Make the `socialLinks` read-modify-write transactional (or atomic SQL) and the `create` existence-check race-safe via upsert/unique-violation mapping (Medium).
4. Emit fire-and-forget audit events on every mutation (Medium).
5. Introduce a dedicated output `SafeUserProfileSchema` and remove the duplicated `.nullable()` chains in the DTO (Low).

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `database-patterns.md`, `logging-monitoring-and-audit-trails.md`, `validation-philosophy.md`, `multi-tenancy-patterns.md`, `caching-patterns.md`, `authorization-and-rbac.md` · Source: `modules/user_profile/user_profile.service.ts`, `user_profile.types.ts`, `user_profile.dto.ts`, `user_profile.enums.ts`, `entities/user_profile.entity.ts`
