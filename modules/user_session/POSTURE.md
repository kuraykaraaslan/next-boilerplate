> **Uygulandı** — 2026-06-10: AppError across token + crud services (SESSION_EXPIRED/UNAUTHORIZED/OTP_REQUIRED), removed hardcoded JWT secret fallbacks + dead guard, fixed dead refresh-token reuse detection (now queries by userSessionId), fixed cache-miss branch to compare ErrorCode instead of message string.

# user_session — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** user_session.cache.service.ts, user_session.crud.service.ts, user_session.service.ts, user_session.token.service.ts
> **Overall grade:** C · **Findings:** 0c / 3h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| user_session.service.ts | 29 | Facade re-exporting token/CRUD/cache static methods as one default class |
| user_session.crud.service.ts | 268 | Session lifecycle: create, impersonation, get, refresh, update, delete, list; idle/absolute-lifetime policy enforcement |
| user_session.token.service.ts | 94 | JWT sign/verify, SHA-256 token hashing, device fingerprint generation |
| user_session.cache.service.ts | 16 | Redis session-cache invalidation for a user |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Services throw raw `Error` instead of `AppError`** — Every failure path across the module throws `new Error(UserSessionMessages.X)` (and one inline-string raw throw) with no statusCode or ErrorCode, so a route handler cannot derive an HTTP status (401 vs 404 vs 409 all collapse to 500). Evidence: `modules/user_session/user_session.crud.service.ts:129,130,144,145,146,148,150,157,178,179,180,181,185,206,228`; `modules/user_session/user_session.token.service.ts:13,69,75,77,89,91` (note `:13` is a hardcoded inline string `"Missing JWT secrets in environment variables"`). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(UserSessionMessages.SESSION_NOT_FOUND, 404, ErrorCode.NOT_FOUND)` etc. with appropriate status/code per message.
- **[Dimension 12 — Security hardening] Hardcoded fallback JWT secrets defeat env validation** — `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` fall back to literal placeholder strings, so a misconfigured deployment silently signs/verifies tokens with a publicly-known secret instead of failing closed. Evidence: `modules/user_session/user_session.token.service.ts:7,9` (`env.ACCESS_TOKEN_SECRET || "your-default-access-token-secret"`). The guard at `:12-14` is dead code — the `||` fallbacks guarantee the values are always truthy. `@/modules/env` already enforces `z.string().min(1)` on both (`modules/env/env.service.ts:22,24`), so the fallback only weakens the contract. Rule: `security-hardening.md`, `secrets-and-configuration-security.md`. Fix: use `env.ACCESS_TOKEN_SECRET` / `env.REFRESH_TOKEN_SECRET` directly and delete the placeholder fallbacks and the dead guard.
- **[Dimension 12 — Security hardening] Refresh-token reuse defense is unreachable (dead control flow)** — In `refreshTokens` the row is fetched via `where: { refreshToken: hashedRefreshToken, ... }`, then the reuse-detection branch re-checks `if (session.refreshToken !== hashedRefreshToken)`, a condition that can never be true given the query, so the family-revocation reuse defense never fires. Evidence: `modules/user_session/user_session.crud.service.ts:176,182-186`. Rule: `security-hardening.md`. Fix: detect reuse by looking up the session by `userSessionId` (from the decoded JWT) and comparing the stored hash against the presented hash, rather than filtering the query by the presented hash.

### 🟡 Medium
- **[Dimension 9 — Caching] `redis.keys()` used for cache invalidation** — `clearUserSessionCache` runs `redis.keys(\`session:${userId}:*\`)`, an O(N) blocking scan that stalls Redis under load; the standard pattern is `SCAN` or a tracked key set. Evidence: `modules/user_session/user_session.cache.service.ts:7-10`. Rule: `caching-patterns.md`. Fix: replace `keys()` with an iterative `scan()` or maintain a per-user set of cache keys to delete.
- **[Dimension 3 — Error handling] Control flow uses exception message string matching** — `getSession` distinguishes a real expiry from a stale-cache miss by comparing `err.message === UserSessionMessages.SESSION_EXPIRED`. With `AppError` this should key off `ErrorCode`, not a string compare on `message`. Evidence: `modules/user_session/user_session.crud.service.ts:133-136`. Rule: `error-handling-and-app-error.md`. Fix: branch on `err instanceof AppError && err.code === ErrorCode.SESSION_EXPIRED` (the code already exists at `modules/common/app-error.ts:4`).
- **[Dimension 5 — DB access] Multi-step refresh write is not transactional** — `refreshTokens` performs `repo.update(...)` then a separate `repo.findOne(...)`, and the reuse/absolute-deadline paths do `delete` + cache-clear as independent statements; a crash between them can leave token state inconsistent. Evidence: `modules/user_session/user_session.crud.service.ts:204-216`. Rule: `database-patterns.md`. Fix: wrap the read-modify-write in `ds.transaction(...)`, or use an atomic `update().returning()` to avoid the follow-up `findOne`.
- **[Dimension 11 — Logging/audit] Security-relevant events are not audit-logged** — Refresh-token reuse (a credential-theft signal), absolute-lifetime termination, and single-session eviction produce no audit entry; the only logging in the module is one `Logger.error` on cache-clear failure. Evidence: `modules/user_session/user_session.crud.service.ts:182-186,203-207,49-52`; `modules/user_session/user_session.cache.service.ts:13`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit-log entry for reuse detection and forced session termination.

### 🔵 Low
- **[Dimension 2 — Boundary validation] `any` casts around metadata/updates erode type safety** — `(session.metadata as any)?.impersonation` and `updates as any` bypass the typed contract that the rest of the module establishes via `SafeUserSessionSchema` / `SessionMeta`. Evidence: `modules/user_session/user_session.crud.service.ts:181,230`. Rule: `zod-validation.md`. Fix: type `metadata` as `SessionMeta | null` and drop the `as any` on the update payload.
- **[Dimension 12 — Security hardening] No rate limiting visible on refresh/get paths in the service** — `refreshTokens` and `getSession` are credential-verification entry points; the service contains no limiter call (acceptable if enforced at the route, but not evidenced here). Evidence: `modules/user_session/user_session.crud.service.ts:166,105`. Rule: `security-hardening.md`. Fix: confirm a limiter wraps these at the route layer or add one.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All classes static-only, single default export, facade re-exports via `.bind` |
| 2 | Boundary validation | ⚠️ | Output goes through `SafeUserSessionSchema`, but `as any` casts (`:181,230`) weaken the typed contract |
| 3 | Error handling | ❌ | Every throw is raw `new Error(...)`, never `AppError` with statusCode/ErrorCode; cache-miss branch keys off `message` string |
| 4 | Messages pattern | ✅ | User-facing strings come from `user_session.messages.ts` (string enum, allowed); one inline string at `token:13` |
| 5 | DB access & entity ownership | ⚠️ | DB only in service, entity under `entities/`, null-checked; multi-write refresh not transactional |
| 6 | Multi-tenancy | ✅ | `user_session` is system-wide (entity has no `tenantId` column); correctly uses `getDataSource()`; `tenantId` arg only feeds policy lookups |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md) |
| 8 | Service composition | ✅ | Sub-services hidden behind `user_session.service.ts` facade; cross-module imports use `@/` alias |
| 9 | Caching | ⚠️ | Invalidation uses blocking `redis.keys()` (`cache:7-10`); idle writes fail open via `.catch`, but the hot `get`/`setex` at `crud:122,128,161` throw on Redis error rather than failing open |
| 10 | Secrets & config | ✅ | All config via `@/modules/env`; no `process.env.X` reads in any service |
| 11 | Logging / audit | ⚠️ | No audit log on reuse detection / forced termination; only one cache-failure `Logger.error` |
| 12 | Security hardening | ❌ | Hardcoded fallback JWT secrets bypass env validation + dead guard; refresh-reuse defense is unreachable |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase classes — all correct |

## Recommendations
1. Replace every `throw new Error(UserSessionMessages.X)` (and the inline string at `token:13`) with `throw new AppError(msg, <status>, ErrorCode.X)` across crud and token services, then switch the cache-miss branch at `crud:133` to compare on `ErrorCode` instead of `message`.
2. Remove the placeholder JWT-secret fallbacks at `token.service.ts:7,9` and delete the now-dead guard at `:12-14`; rely on `@/modules/env`'s `min(1)` enforcement.
3. Fix the refresh-token reuse detection (`crud:182`) to look the session up by `userSessionId` and compare stored vs presented hash, so family revocation actually triggers.
4. Wrap the refresh read-modify-write in a transaction (or use `update().returning()`); add fire-and-forget audit entries for reuse detection and forced session termination.
5. Replace `redis.keys()` in `clearUserSessionCache` with `SCAN` or a tracked per-user key set; drop the `as any` casts in favor of `SessionMeta` typing.

## References
- Rules: error-handling-and-app-error.md, security-hardening.md, secrets-and-configuration-security.md, caching-patterns.md, database-patterns.md, logging-monitoring-and-audit-trails.md, zod-validation.md, multi-tenancy-patterns.md, authorization-and-rbac.md · Source: user_session.service.ts, user_session.crud.service.ts, user_session.token.service.ts, user_session.cache.service.ts
