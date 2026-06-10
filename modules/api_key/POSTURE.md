> **Uygulandı** — 2026-06-10: All 12 raw Error throws → AppError (404 NOT_FOUND, 401 UNAUTHORIZED, 403 FORBIDDEN); webhook dispatches on create/delete → .catch(() => {}) fail-open; redis.del → .catch(() => {}) fail-open in clearCache.

# api_key — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** api_key.service.ts
> **Overall grade:** C · **Findings:** 0c / 1h / 2m / 0l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| api_key.service.ts | 234 | CRUD for tenant API keys (list/getById/create/update/delete), raw-key generation + SHA-256 hashing, request verification (`verify`, `verifyFromAuthHeader`) with Redis caching and feature gating. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `throw new Error` instead of `AppError`** — Every error path throws a raw `Error` carrying an `ApiKeyMessages.*` string, so a route handler cannot derive an HTTP status (404 vs 401 vs 403) or a stable `ErrorCode`. `verify`/`verifyFromAuthHeader` are the auth boundary for SCIM/M2M, so they would surface as 500 instead of 401/403. Evidence: `modules/api_key/api_key.service.ts:66,123,141,164,183,186,189,193,219,222,225,230`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw e.g. `new AppError(ApiKeyMessages.NOT_FOUND, 404, ErrorCode.NOT_FOUND)`; `INVALID_KEY`/`KEY_INACTIVE`/`KEY_EXPIRED` → 401, `INSUFFICIENT_SCOPE` → 403.

### 🟡 Medium
- **[Dimension 11 — Logging and audit] No audit trail for sensitive credential lifecycle** — `create` and `delete` mint/revoke long-lived credentials but only emit a `WebhookService.dispatchEvent`; there is no audit-log entry. API-key creation/revocation is a security-meaningful action that should be audit-logged fire-and-forget. Evidence: `modules/api_key/api_key.service.ts:105,145` (webhook dispatch, no audit). Rule: `logging-monitoring-and-audit-trails.md`. Fix: add a fire-and-forget `AuditLogService.log(...)` on create/update/delete (and ideally on failed `verify` for credential-stuffing visibility).
- **[Dimension 7 — Authorization / RBAC] Resource-level authz not enforced in service** — CRUD methods trust the `tenantId`/`createdByUserId` passed by the caller; no per-resource role/ownership check inside the service (membership/RBAC enforced at route layer). The `create` path does add a defense-in-depth feature gate (`assertFeatureAccess`), but mutating operations (`update`/`delete`) have no in-service role assertion. Evidence: `modules/api_key/api_key.service.ts:82-84` (gate present on create only), `114-149` (update/delete, no role check). Rule: `authorization-and-rbac.md`. Note: authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Tenant-scoped queries all carry their `tenantId` filter, so there is no cross-tenant/IDOR risk.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single `export default class ApiKeyService`, all static, never instantiated. |
| 2 | Boundary validation | ✅ | Service takes typed DTO inputs; all returns go through `SafeApiKeySchema.parse` (omits `keyHash`). |
| 3 | Error handling | ❌ | 12 raw `throw new Error(...)` sites; should be `AppError` with statusCode + `ErrorCode`. |
| 4 | Messages pattern | ✅ | Uses `api_key.messages.ts` const-object; no inline user-facing strings in the service. |
| 5 | DB access / entity ownership | ✅ | DB only via repos, entity under `entities/`, null-checked after `findOne`, no raw SQL; single-write ops so no tx needed. |
| 6 | Multi-tenancy | ✅ | Tenant CRUD uses `tenantDataSourceFor` + `tenantId` filter; cross-tenant `verify` by global `keyHash` via `getDataSource()` is correct by design and re-pins tenant in `verifyFromAuthHeader`. |
| 7 | Authorization / RBAC | ⚠️ | Feature gate on `create`; resource-level role check deferred to route layer (deviation from authorization-and-rbac.md). No missing tenantId filter, so no IDOR. |
| 8 | Service composition | ✅ | Cross-module deps (`WebhookService`, `TenantFeatureGateService`, `db`, `redis`, `env`) imported via `@/` aliases; no sub-service cycles. |
| 9 | Caching | ✅ | singleFlight + negative cache (`__not_found__`) + `jitter` TTL + fail-open `.catch(() => …)` throughout. |
| 10 | Secrets and config | ✅ | TTL from `env.TENANT_CACHE_TTL`; no `process.env` read in service. |
| 11 | Logging and audit | ⚠️ | Webhook events on create/delete but no audit-log entry for credential lifecycle. |
| 12 | Security hardening | ✅ | SHA-256 key hashing, never stores/returns raw key after issuance, negative cache blunts credential-stuffing, Bearer parsing trimmed, `keyHash` omitted from output. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/suffixed files, PascalCase class, entity under `entities/`. |

## Recommendations
1. **Replace all 12 raw `throw new Error` with `AppError`** carrying explicit statusCode + `ErrorCode` (404 for `NOT_FOUND`; 401 for `INVALID_KEY`/`KEY_INACTIVE`/`KEY_EXPIRED`; 403 for `INSUFFICIENT_SCOPE`). This is the only blocker to grade B.
2. **Add fire-and-forget audit logging** on `create`/`update`/`delete` (and optionally failed `verify`) alongside the existing webhook dispatch.
3. **Add an in-service role/ownership assertion** for `update`/`delete`, or document that route-layer RBAC is the contract, to align with `authorization-and-rbac.md`.

## References
- Rules: `error-handling-and-app-error.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `multi-tenancy-patterns.md`, `caching-patterns.md`, `module-messages-pattern.md` · Source: `modules/api_key/api_key.service.ts`, `api_key.types.ts`, `api_key.dto.ts`, `api_key.enums.ts`, `api_key.messages.ts`, `entities/api_key.entity.ts`
