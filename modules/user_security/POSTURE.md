# user_security — Posture Review

> **Uygulandı:** 2026-06-11 — High: AppError on all throw sites in both services (404/409/400), raw SQL in verifyAuthentication replaced with QueryBuilder on UserSecurityEntity; Medium: JSONB read-modify-write in registerPasskey/deletePasskey/pushPasswordHistory wrapped in transactions, dynamic import() replaced with static; Low: user_security.messages.ts created for inline strings.

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** user_security.service.ts, user_security.passkey.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| user_security.service.ts | 191 | CRUD over the `user_securities` system entity: get/safe-get (Redis-cached), create-default, update/upsert, login-attempt + lockout tracking, password-history rotation, must-change-password flag. |
| user_security.passkey.service.ts | 282 | WebAuthn/passkey lifecycle: registration & authentication option generation + verification (via `@simplewebauthn/server`), passkey list/delete, resident-key (usernameless) flow. Delegates persistence to UserSecurityService. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError` across both services** — Services throw `new Error(...)`, so a route handler cannot derive an HTTP status (defaults to 500 for what are really 404/409/429/400 conditions). Evidence: `user_security.service.ts:66` (already-exists — should be 409), `:78`, `:120`, `:160` (record not found — should be 404); `user_security.passkey.service.ts:52` (limit reached — 429/409), `:93`/`:220` (challenge expired — 400/410), `:104` (registration failed — 400) / `:236` (authentication failed — 400), `:141`/`:202` (user not found — 404), `:146`/`:207` (not registered — 404), `:259` (passkey not found — 404). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(message, status, ErrorCode.X)` for each case.
- **[Dimension 5 — DB access / entity ownership] Raw SQL in passkey authentication** — `verifyAuthentication` issues a hand-written `ds.query<...>('SELECT "userId" FROM "users" WHERE EXISTS (SELECT 1 FROM jsonb_array_elements("passkeys") ...))', [response.id])`. Although parameterized (no injection here), raw SQL in a service violates the repository/QueryBuilder convention and couples this module to the `users` table schema. Evidence: `user_security.passkey.service.ts:179-191`. Rule: `database-patterns.md`. Fix: replace with a TypeORM QueryBuilder (`.where("passkeys @> :cred", ...)`) or expose a lookup-by-credential method on the user module facade.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Internal getter returns unfiltered secret-bearing shape** — `getByUserId` returns the full `UserSecurity` (includes `otpSecret`, `otpBackupCodes`, `passwordHistory`); only `getSafeByUserId` applies `SafeUserSecuritySchema`. There is no leak if routes never serialize the unsafe object, but the boundary relies on caller discipline rather than a Safe* schema at the edge. Evidence: `user_security.service.ts:19-35`, consumed at `user_security.passkey.service.ts:49,122,143,204,256,272`. Rule: `validation-philosophy.md`. Fix: keep `getByUserId` strictly internal and ensure every route surface returns `getSafeByUserId` / a safe projection (`listPasskeys` already projects to a safe subset).
- **[Dimension 5 — DB access / entity ownership] Read-modify-write on JSONB arrays without a transaction** — Passkey add/update/delete read `getByUserId`, mutate the in-memory `passkeys` array, then call `updateUserSecurity` (separate query). Concurrent passkey operations (e.g. parallel register + delete) can lose writes (last-writer-wins on the whole JSONB column). Evidence: `user_security.passkey.service.ts:122-127` (register), `238-248` (auth counter bump), `261-266` (delete); the same read-then-update pattern also appears in `user_security.service.ts:156-171` (`pushPasswordHistory`). Rule: `database-patterns.md` (transactions for multi-write). Fix: wrap read+update in a single `ds.transaction(...)` or use an atomic `jsonb_set` / `@>` update.
- **[Dimension 5 — DB access] Dynamic `import()` of an already-imported module inside a hot method** — `verifyAuthentication` does `const { SafeUserSchema } = await import('../user/user.types')` on every call, even though `../user/user.types` is already statically imported at the top of the file (line 28, `SafeUser`). This adds per-call overhead with no cycle-breaking benefit. Evidence: `user_security.passkey.service.ts:251` (vs static import at `:28`). Rule: `import-rules.md` / `service-composition-pattern.md`. Fix: add `SafeUserSchema` to the existing top-level import.
- **[Dimension 8 — Service composition] Cross-module reach into another module's entity** — The passkey service imports `User as UserEntity` from `../user/entities/user.entity` and queries the `users` repository directly instead of going through the user module's service facade. Evidence: `user_security.passkey.service.ts:16,140,195,199`. Rule: `service-composition-pattern.md`, `import-rules.md`. Fix: call a `findByEmail` / `findByPasskeyCredentialId` method on the `@/modules/user` facade.

### 🔵 Low
- **[Dimension 4 — Messages] Hardcoded inline prose strings in the core service** — `user_security.service.ts` throws inline English strings (`'Security record already exists for this user'`, `'Security record not found'`) directly rather than referencing a `user_security.messages.ts`. The passkey service correctly centralises strings in `user_security.passkey.messages.ts`. Evidence: `user_security.service.ts:66,78,120,160`. Rule: `module-messages-pattern.md`. Fix: add a `user_security.messages.ts` and reference its keys.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Both are `default class` with only static methods, single default export, never instantiated. |
| 2 | Boundary validation | ⚠️ | Output goes through `UserSecuritySchema`/`SafeUserSecuritySchema`/`SafeUserSchema`; `getByUserId` returns unsafe shape relied on by caller discipline. |
| 3 | Error handling | ❌ | Pervasive raw `throw new Error(...)`; no `AppError`/`ErrorCode`, so HTTP status is lost. Cache `.catch(() => {})` fail-open is correct. |
| 4 | Messages pattern | ⚠️ | Passkey service uses a messages source; core service hardcodes inline prose strings. |
| 5 | DB access / entity ownership | ❌ | Raw SQL in passkey auth; read-modify-write on JSONB without transactions; null-checks present after `findOne`. |
| 6 | Multi-tenancy | ✅ | `user_securities` and `users` are system-wide entities; correct use of `getDataSource()`, no tenant scoping required. |
| 7 | Authorization / RBAC | ⚠️ | No in-service ownership check; authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ⚠️ | Reaches into the user module's entity/repository directly and uses a redundant dynamic `import()` instead of the facade. |
| 9 | Caching | ✅ | `singleFlight` + jittered TTL + fail-open `.catch` + parse-then-evict on corrupt cache; passkey challenges use Redis with EX TTL. |
| 10 | Secrets / config | ✅ | All config via `@/modules/env`; no `process.env.X` in either service. |
| 11 | Logging / audit | ⚠️ | Security-relevant actions (lockout, passkey add/delete, password rotation) are not audit-logged; no secret leakage observed. |
| 12 | Security hardening | ⚠️ | WebAuthn origin/RPID checks correct and counter is updated; `requireUserVerification: false` (lines 100, 233) and no rate limit on registration/auth option generation in-service. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab/dot-suffixed files, PascalCase classes, entity under `entities/`. |

## Recommendations
1. (High) Replace every `throw new Error(...)` in both services with `AppError(message, statusCode, ErrorCode.X)` — map not-found→404, already-exists→409, limit→429, challenge-expired→410/400, verification-failed→400. This is the single highest-impact fix.
2. (High) Remove the raw SQL in `verifyAuthentication`; use a TypeORM QueryBuilder or a `findByPasskeyCredentialId` method on the user facade.
3. (Medium) Wrap passkey read-modify-write and `pushPasswordHistory` in `ds.transaction(...)` (or atomic JSONB updates) to prevent lost updates under concurrency.
4. (Medium) Fold the dynamic `import('../user/user.types')` into the existing top-level import and route `UserEntity` access through the `@/modules/user` facade to fix the composition boundary.
5. (Low) Add `user_security.messages.ts` and move the inline strings in the core service into it.
6. (Low) Audit-log lockouts, passkey add/delete, and password rotation fire-and-forget; consider a rate limit on passkey option-generation endpoints.

## References
- Rules: `error-handling-and-app-error.md`, `database-patterns.md`, `validation-philosophy.md`, `service-composition-pattern.md`, `import-rules.md`, `module-messages-pattern.md`, `multi-tenancy-patterns.md`, `caching-patterns.md`, `authorization-and-rbac.md`, `security-hardening.md` · Source: `modules/user_security/user_security.service.ts`, `modules/user_security/user_security.passkey.service.ts`
