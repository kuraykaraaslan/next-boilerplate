# user_social_account — Posture Review

> **Uygulandı:** 2026-06-10 — High AppError (link → 409 CONFLICT, unlink → 404 NOT_FOUND).

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `user_social_account.service.ts`
> **Overall grade:** C · **Findings:** 0c / 2h / 2m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `user_social_account.service.ts` | 123 | Per-user linked OAuth/SAML accounts: read by user, lookup by provider/providerId, link/unlink, token refresh; Redis-cached reads. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — `link()` throws a raw `Error` on the cross-user collision path, so a route handler cannot derive an HTTP status (this should be a 409 Conflict). Evidence: `modules/user_social_account/user_social_account.service.ts:77`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(UserSocialAccountMessages.ACCOUNT_ALREADY_LINKED, 409, ErrorCode.CONFLICT)` (import from `@/modules/common/app-error`).
- **[Dimension 3 — Error handling] Raw `Error` instead of `AppError`** — `unlink()` throws a raw `Error` when the account is absent, losing the intended 404 status. Evidence: `modules/user_social_account/user_social_account.service.ts:111`. Rule: `error-handling-and-app-error.md`. Fix: `throw new AppError(UserSocialAccountMessages.ACCOUNT_NOT_FOUND, 404, ErrorCode.NOT_FOUND)`.

### 🟡 Medium
- **[Dimension 11 — Logging and audit] No audit trail on identity mutations** — `link`, `updateTokens`, and `unlink` change federated-login identity and OAuth tokens with no fire-and-forget audit log, so account takeover via provider linking would be untraceable. Evidence: `modules/user_social_account/user_social_account.service.ts:64,95,107`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: emit a fire-and-forget audit event (link/unlink/token-refresh) with `userId`, `provider`, `providerId` — never the token values.
- **[Dimension 7 — Authorization / RBAC] No resource-level ownership check in service** — `updateTokens(userSocialAccountId, …)` trusts a caller-supplied account id with no in-service ownership assertion and never verifies it belongs to the acting user; `unlink(userId, provider)` likewise trusts the caller-supplied `userId`. Evidence: `modules/user_social_account/user_social_account.service.ts:95,107`. Rule: `authorization-and-rbac.md`. Note: authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Fix: scope `updateTokens` by the owning `userId`, or document the route-layer ownership guarantee in the module README.

### 🔵 Low
- **[Dimension 13 — Naming and file organization] Unused message constant / unenforced guard** — `CANNOT_UNLINK_ONLY_AUTH` is defined in the messages file but never referenced; the safety check it implies ("cannot unlink the only auth method") is not enforced in `unlink()`. Evidence: `modules/user_social_account/user_social_account.messages.ts:4`. Rule: `naming-conventions.md`. Fix: either implement the last-auth-method guard in `unlink()` using this message, or remove the dead constant.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `default class` with only static methods; never instantiated. |
| 2 | Boundary validation | ✅ | DB output filtered through `SafeUserSocialAccountSchema` (omits access/refresh tokens) on every return path; typed inputs trusted. |
| 3 | Error handling | ❌ | Two raw `throw new Error(...)` at lines 77, 111 instead of `AppError` + `ErrorCode`. |
| 4 | Messages pattern | ✅ | Uses `user_social_account.messages.ts`; no inline user-facing strings in the service. |
| 5 | DB access and entity ownership | ✅ | DB only in service; entity under `entities/`; `findOne` null-checked before use; no raw SQL. |
| 6 | Multi-tenancy | ✅ | System-wide entity (no `tenantId` column); correctly uses `getDataSource()`. |
| 7 | Authorization / RBAC | ⚠️ | No in-service ownership check; `updateTokens` keyed only by `userSocialAccountId`. Authz assumed at route layer (deviation from authorization-and-rbac.md). |
| 8 | Service composition and boundaries | ✅ | No sub-service cross-imports; cross-module imports use `@/` alias (`@/modules/db`, `@/modules/redis`, `@/modules/env`). |
| 9 | Caching | ✅ | `singleFlight`, negative cache (lines 49, 58–59), jittered TTL, fail-open `.catch()` on all Redis ops, cache invalidation on writes. |
| 10 | Secrets and config | ✅ | TTL from `env.SESSION_CACHE_TTL`; no `process.env.X` in service. |
| 11 | Logging and audit | ❌ | No audit logging on `link`/`updateTokens`/`unlink` identity & token mutations. |
| 12 | Security hardening | ✅ | Safe schema omits tokens from cached/returned payloads; cache keys not injectable; no service-layer rate-limiting concern. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/snake files, PascalCase class, correct suffixes. (Low: one dead message constant.) |

## Recommendations
1. Replace the two raw `throw new Error(...)` (lines 77, 111) with `AppError` carrying explicit `statusCode` + `ErrorCode` (`CONFLICT`/409 and `NOT_FOUND`/404).
2. Add fire-and-forget audit logging to `link`, `updateTokens`, and `unlink` — record actor, provider, providerId; never log token values.
3. Scope `updateTokens` by the owning `userId` (or document the route-layer ownership contract in the README) to close the IDOR-by-id gap.
4. Implement the "cannot unlink the only authentication method" guard in `unlink()` using the already-defined `CANNOT_UNLINK_ONLY_AUTH` message, or remove the dead constant.

## References
- Rules: `error-handling-and-app-error.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `caching-patterns.md`, `multi-tenancy-patterns.md`, `naming-conventions.md` · Source: `modules/user_social_account/user_social_account.service.ts`, `user_social_account.types.ts`, `user_social_account.messages.ts`, `user_social_account.enums.ts`, `entities/user_social_account.entity.ts`
