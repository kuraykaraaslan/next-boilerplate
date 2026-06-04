# auth_sso — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** auth_sso.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| auth_sso.service.ts | 268 | OAuth/SSO facade: build auth URLs, exchange code → profile/tokens, authenticate-or-register, link/unlink social accounts, sign/verify link-intent state, sanitize return paths. Delegates all persistence to UserService and UserSocialAccountService. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown instead of `AppError`** — Five throw sites use `throw new Error(SSOMessages.X)` with no `statusCode` or `ErrorCode`, so the route/callback layer cannot derive an HTTP status and these collapse to generic 500s. Evidence: `modules/auth_sso/auth_sso.service.ts:41` (PROVIDER_NOT_CONFIGURED), `:58` (CODE_NOT_FOUND), `:62` (PROVIDER_NOT_CONFIGURED), `:243` (EMAIL_NOT_FOUND), `:246` (EMAIL_MISMATCH). Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(SSOMessages.X, 400, ErrorCode.<Y>)` — e.g. 400 for missing code, 409/403 for email mismatch.

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Provider output not re-validated through the Safe schema** — `handleCallback` returns `profile`/`tokens` straight from the provider class (`getTokens`/`getUserInfo`) without parsing through `SSOProfileSchema` / `SSOTokensSchema`, even though those schemas exist in `auth_sso.types.ts`. External provider JSON is the least-trusted input in the module. Evidence: `modules/auth_sso/auth_sso.service.ts:67-70`. Rule: `validation-philosophy.md`, `zod-validation.md`. Fix: `SSOProfileSchema.parse(profile)` / `SSOTokensSchema.parse(tokens)` before returning, so a malformed provider response fails closed.
- **[Dimension 11 — Logging and audit] No audit trail for account-linking actions** — `authenticateOrRegister`, `linkAccount`, `linkToUser`, and `unlinkAccount` mutate the user's identity/credential graph (create user, link/unlink social account) but emit no fire-and-forget audit event. These are exactly the security-relevant actions the audit rule targets. Evidence: `modules/auth_sso/auth_sso.service.ts:92-166`, `:168-183`, `:233-259`, `:261-263`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a best-effort `AuditLogService` entry (provider, userId, action) wrapped so a logging failure never aborts the flow.
- **[Dimension 12 — Security hardening] `jwt.verify` does not pin the algorithm** — The link-state token is verified with `jwt.verify(state, env.CSRF_SECRET)` and no `{ algorithms: ['HS256'] }` allow-list, while `jwt.sign` uses the default HS256. Pinning the verifier algorithm is the standard defense against algorithm-substitution mistakes. Evidence: `modules/auth_sso/auth_sso.service.ts:207` (verify), `:200` (sign). Rule: `security-hardening.md`. Fix: pass `{ algorithms: ['HS256'] }` to `jwt.verify`.

### 🔵 Low
- **[Dimension 5 — DB access] Consumes a raw entity from a collaborator** — `authenticateOrRegister` reads `UserService.getByEmail`, which returns the raw `User` entity (not a Safe* type), then re-fetches via `getById` (which does return `SafeUser`). No leak occurs because the raw entity is only used for its `userId`, but the dependency on un-narrowed output is fragile. Evidence: `modules/auth_sso/auth_sso.service.ts:130-141`. Rule: `database-patterns.md`. Fix: prefer an existence/id-only lookup, or have the user module expose a Safe variant.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default-exported class, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | Safe schemas (`SSOProfileSchema`/`SSOTokensSchema`) exist but provider output is returned without `parse`. |
| 3 | Error handling | ❌ | 5× raw `new Error(...)` instead of `AppError` (lines 41, 58, 62, 243, 246). |
| 4 | Messages pattern | ✅ | All user-facing strings sourced from `auth_sso.messages.ts`; none inline. |
| 5 | DB access / ownership | ⚠️ | No DB touched directly; consumes a raw `User` entity from collaborator (low risk). |
| 6 | Multi-tenancy | — | No tenant-scoped queries here; SSO identities are system-wide via UserService. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition | ✅ | Clean facade over provider classes + UserService/UserSocialAccountService; no cycles (cross-module imports use `../` relative paths rather than `@/`). |
| 9 | Caching | — | No hot read path; caching not applicable. |
| 10 | Secrets and config | ✅ | All config via `@/modules/env` (CSRF_SECRET) and `auth_sso.config`; no `process.env` in the service. |
| 11 | Logging and audit | ⚠️ | No audit events for register/link/unlink — security-relevant mutations. |
| 12 | Security hardening | ⚠️ | `jwt.verify` lacks algorithm pinning; open-redirect/CSRF defenses (`safeReturnPath`, signed state, email-match) are otherwise solid. |
| 13 | Naming / file org | ✅ | snake_case module, kebab/`.service.ts` suffixes, PascalCase `SSOService`. |

## Recommendations
1. Replace all 5 `throw new Error(SSOMessages.X)` with `AppError(message, statusCode, ErrorCode.X)` so the OAuth callback returns correct 4xx codes (High).
2. Pin `jwt.verify(state, env.CSRF_SECRET, { algorithms: ['HS256'] })` (Medium, quick win).
3. Parse provider `profile`/`tokens` through `SSOProfileSchema`/`SSOTokensSchema` in `handleCallback` to fail closed on malformed responses (Medium).
4. Add fire-and-forget audit logging to `authenticateOrRegister`, `linkAccount`, `linkToUser`, and `unlinkAccount` (Medium).

## References
- Rules: error-handling-and-app-error.md, validation-philosophy.md, zod-validation.md, security-hardening.md, logging-monitoring-and-audit-trails.md, authorization-and-rbac.md, service-composition-pattern.md, env-and-config.md · Source: modules/auth_sso/auth_sso.service.ts (+ auth_sso.config.ts, .messages.ts, .dto.ts, .types.ts, .enums.ts)
