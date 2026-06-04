# auth — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** auth.service.ts, auth.captcha.service.ts, auth.otp.service.ts, auth.password.service.ts, auth.policy.service.ts, auth.totp.service.ts
> **Overall grade:** C · **Findings:** 0c / 3h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| auth.service.ts | 334 | Login, register, change/verify/reset orchestration, email verification, dormant-account sweep, role check |
| auth.captcha.service.ts | 61 | Per-identity failed-login CAPTCHA threshold counter + reCAPTCHA verification |
| auth.otp.service.ts | 212 | Email/SMS OTP request, verify, rate limiting, session OTP invalidation |
| auth.password.service.ts | 132 | Forgot/reset password tokens, policy + history enforcement on reset |
| auth.policy.service.ts | 330 | Resolve password/lockout/session/dormant/admin/access policies from settings; password & admin-IP validation |
| auth.totp.service.ts | 215 | TOTP setup/verify/disable, backup code generation & consumption |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Services throw raw `Error` instead of `AppError`** — Every throw across the module uses `throw new Error(AuthMessages.X)`, so a route handler cannot derive an HTTP status or `ErrorCode`. All 4xx-class conditions (invalid credentials, locked, rate-limited, expired token, etc.) collapse to a generic 500. Evidence: `modules/auth/auth.service.ts:46,48,65,79,91,113,141,169,174,205,209,215,220,243,244,247,264,265,269,272`; `modules/auth/auth.otp.service.ts:74,82,94,123,159,165,177`; `modules/auth/auth.password.service.ts:45,54,80,84,87,92,97`; `modules/auth/auth.totp.service.ts:64,69,104,108,113,127,137,141,146,163,167`. Rule: `error-handling-and-app-error.md`. Fix: import `{ AppError, ErrorCode }` from `@/modules/common/app-error` and throw e.g. `new AppError(AuthMessages.INVALID_EMAIL_OR_PASSWORD, 401, ErrorCode.INVALID_CREDENTIALS)`, `... 429, ErrorCode.RATE_LIMIT_EXCEEDED`, `... 423/403` for lock/disable, `... 404, ErrorCode.NOT_FOUND` for user-not-found.
- **[Dimension 12 — Security hardening] MFA backup codes generated with `Math.random()`** — Backup codes are a single-factor account-recovery secret yet are produced from non-cryptographic `Math.random()`, which is predictable and reproducible from observed output. The same file's TOTP path is fine, and `auth.service.ts:25` explicitly documents replacing `Math.random` with `crypto.randomInt` for exactly this reason — making this an inconsistent regression. Evidence: `modules/auth/auth.totp.service.ts:81` (verifyAndEnable) and `modules/auth/auth.totp.service.ts:174` (generateBackupCodes). Rule: `security-hardening.md`. Fix: replace `Math.floor(Math.random() * charset.length)` with `crypto.randomInt(charset.length)`.
- **[Dimension 2 — Boundary validation] Policy validation error keys thrown as opaque strings** — `validatePassword` returns bare string literals (`'PASSWORD_TOO_SHORT'`, etc.) that callers re-throw via `throw new Error(policyError)`; these keys are not wrapped in `AppError`, so they surface as untyped 500s with no status mapping. Evidence: `modules/auth/auth.policy.service.ts:261-278`; consumed at `modules/auth/auth.service.ts:174,209` and `modules/auth/auth.password.service.ts:92`. Rule: `error-handling-and-app-error.md`, `validation-philosophy.md`. Fix: return `AuthMessages` enum members (the keys already exist, e.g. `AuthMessages.PASSWORD_TOO_SHORT`) and have callers throw `AppError(..., 422, ErrorCode.VALIDATION_ERROR)`.

### 🟡 Medium
- **[Dimension 5 — DB access] Raw SQL string in dormant-account sweep** — `disableDormantAccounts` issues a hand-written SQL join via `ds.query(...)` instead of QueryBuilder/repository APIs, bypassing entity typing (the rule discourages raw SQL). Inputs are parameterized (`$1`), so there is no injection risk, but it is a deviation. Evidence: `modules/auth/auth.service.ts:303-312`. Rule: `database-patterns.md`. Fix: express the `lastLoginAt`/`createdAt` COALESCE join with `createQueryBuilder().leftJoin(...)`, or isolate the read in `UserSecurityService` rather than reaching across to `user_securities` from auth.
- **[Dimension 5 — DB access] Multi-write operations not wrapped in a transaction** — `register` performs user `save` + password-history seed + tenant provisioning + invitation auto-accept as independent awaits; `resetPassword`/`changePassword` perform password `update` + history push as separate writes. A failure mid-sequence leaves partial state (e.g. user created but no personal tenant). Evidence: `modules/auth/auth.service.ts:183-192,224-225`; `modules/auth/auth.password.service.ts:103-104`. Rule: `database-patterns.md`. Fix: wrap the related writes in `ds.transaction(...)` where atomicity matters.
- **[Dimension 11 — Logging & audit] Password reset / change / email-verification not audit-logged** — Login paths are well audit-logged (fire-and-forget), but `resetPassword`, `changePassword`, `forgotPassword`, `verifyEmail`, and `disableDormantAccounts` (bulk status change) emit only `Logger.info`/none, not `AuditLogService` entries, so security-relevant credential events leave no audit trail. Evidence: `modules/auth/auth.password.service.ts:42-114`; `modules/auth/auth.service.ts:201-227,260-279,295-333`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: add fire-and-forget `AuditLogService.log` calls for these mutations.
- **[Dimension 12 — Security hardening] `forgotPassword` enables user enumeration** — `forgotPassword` throws `USER_NOT_FOUND` when the email is unknown (`auth.password.service.ts:45`), letting an attacker enumerate registered emails; the login path deliberately avoids this with a generic message. Evidence: `modules/auth/auth.password.service.ts:42-45`. Rule: `security-hardening.md`. Fix: return success regardless of whether the email exists (only send mail when it does).

### 🔵 Low
- **[Dimension 1 — Static service class] `any` casts on entity writes** — Repeated `as any` casts when writing/checking `otpMethods`/`otpBackupCodes` weaken the typed-service contract. Evidence: `modules/auth/auth.totp.service.ts:90,91,107,140,152,166,182,210`. Rule: `code-structure-ts-master.md`. Fix: type the `UserSecurity` update payload so casts are unnecessary.
- **[Dimension 8 — Service composition] `setupOtpLib` mutates global otplib state via `as any`** — `authenticator.options = {...} as any` reconfigures shared library state on every call; acceptable but fragile under concurrency. Evidence: `modules/auth/auth.totp.service.ts:19-25`. Rule: `service-composition-pattern.md`. Fix: build a scoped `TOTP` instance instead of mutating the singleton.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All six are static classes, single default export; minor `as any` casts (Low) |
| 2 | Boundary validation | ⚠️ | Output filtered via `SafeUserSchema.parse` (good); policy returns opaque string keys (High) |
| 3 | Error handling | ❌ | Pervasive `throw new Error(...)` instead of `AppError` across all services (High) |
| 4 | Messages pattern | ✅ | Uses `auth.messages.ts` enum; no hardcoded inline user-facing strings (SMS body is operational text) |
| 5 | DB access & entity ownership | ⚠️ | Reuses system `user` entity correctly + null-checks; raw SQL + missing transactions (Medium) |
| 6 | Multi-tenancy | ✅ | `users`/`user_securities` are system-wide; `getDataSource()` is correct; no tenant-scoped query missing a filter |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md) |
| 8 | Service composition | ✅ | Cross-module via `@/` alias / default facades; minor global-state mutation in otplib setup (Low) |
| 9 | Caching | — | No hot read path; Redis used correctly for tokens/rate limits, not as a cache |
| 10 | Secrets & config | ✅ | Config via `@/modules/env`; reCAPTCHA secret via `SettingService`; no `process.env.X` in services |
| 11 | Logging & audit | ⚠️ | Login paths audited fire-and-forget; password/email/dormant mutations not audited (Medium) |
| 12 | Security hardening | ❌ | `Math.random()` for MFA backup codes (High); user-enumeration in `forgotPassword` (Medium) |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/dotted file names, PascalCase classes, `.service.ts` suffixes |

## Recommendations
1. Replace every `throw new Error(AuthMessages.X)` with `throw new AppError(message, statusCode, ErrorCode.X)` so routes return correct HTTP statuses (highest-impact, mechanical change across all six files).
2. Switch MFA backup-code generation to `crypto.randomInt` at `auth.totp.service.ts:81,174`.
3. Have `validatePassword` return `AuthMessages` enum members and wrap policy failures in `AppError(..., 422, ErrorCode.VALIDATION_ERROR)`.
4. Wrap multi-write flows (`register`, `resetPassword`, `changePassword`) in `ds.transaction(...)`.
5. Add audit-log entries for password reset/change, email verification, and the dormant-account sweep.
6. Make `forgotPassword` non-enumerating (uniform success response).

## References
- Rules: error-handling-and-app-error.md, validation-philosophy.md, zod-validation.md, database-patterns.md, multi-tenancy-patterns.md, authorization-and-rbac.md, logging-monitoring-and-audit-trails.md, security-hardening.md, secrets-and-configuration-security.md, naming-conventions.md · Source: modules/auth/auth.service.ts, auth.captcha.service.ts, auth.otp.service.ts, auth.password.service.ts, auth.policy.service.ts, auth.totp.service.ts
