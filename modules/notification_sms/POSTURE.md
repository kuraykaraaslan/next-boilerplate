# notification_sms — Posture Review

> **Uygulandı:** 2026-06-11 — Medium: assertSmsFeatureAccess moved outside swallow-all try/catch so plan/quota AppErrors propagate; Low: rate-limit key now tenant-scoped (sms:rate-limit:{tenantId}:{to}).

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `notification_sms.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 1m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `notification_sms.service.ts` | 377 | Tenant-scoped outbound SMS: BullMQ queue/worker, billing/quota gate, per-region provider resolution (Twilio/NetGSM/Clickatell/Nexmo), phone parse/validation, allowed-country gate, rate limiting; persistence delegated to `NotificationLogService` / `TenantUsageService`. |

## Findings

### 🟡 Medium
- **[Dimension 3 — Error handling] Over-broad catch swallows the billing/quota gate failure.** The public `sendShortMessage` wraps the entire body — including `assertSmsFeatureAccess(tenantId)` — in a try/catch that only `Logger.error`s and returns `void`. A `FEATURE_NOT_AVAILABLE` / `QUOTA_EXCEEDED` throw from the feature gate is therefore silently downgraded to a log line, so the caller cannot distinguish "queued" from "blocked by plan". Evidence: `modules/notification_sms/notification_sms.service.ts:211-233` (gate at `:217`, swallow-all catch at `:230-232`). Rule: `error-handling-and-app-error.md`. Fix: run `assertSmsFeatureAccess` outside the swallow-all block (or re-throw `AppError` instances) so plan/quota denials surface, while keeping delivery-side failures fire-and-forget.

### 🔵 Low
- **[Dimension 1 — Static service class] Module-load side effects in a `static {}` block.** The class instantiates a live BullMQ `Queue`/`Worker` and registers event handlers at class-load time, so importing the service opens Redis connections as a side effect. Functionally a singleton, but it deviates from the "pure static methods, never instantiated, no load-time side effects" ideal. Evidence: `modules/notification_sms/notification_sms.service.ts:95-123`. Rule: `code-structure-ts-master.md`. Fix: acceptable for a worker module; consider a lazy/explicit `init()` if import-time connection cost becomes an issue.
- **[Dimension 12 — Security hardening] Rate-limit key is global per phone number, not tenant-scoped.** `RATE_LIMIT_PREFIX + to` keys the limiter on the destination number alone, so one tenant's traffic to a number throttles every tenant's traffic to that same number (cross-tenant interference, though not a data leak). Evidence: `modules/notification_sms/notification_sms.service.ts:219`. Rule: `security-hardening.md`. Fix: include `tenantId` in the rate-limit key (`sms:rate-limit:{tenantId}:{to}`).

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | All-static, single default export; but live Queue/Worker created at load time in `static {}` (Low). |
| 2 | Boundary validation | ⚠️ | Service trusts typed input per convention (routes Zod-validate); only a defensive `!to/body?.trim()` guard; no DB output returned, so no `Safe*Schema` needed. |
| 3 | Error handling | ⚠️ | No raw `Error` and no `AppError`; over-broad catch in `sendShortMessage` swallows the feature-gate throw (Medium). |
| 4 | Messages pattern | — | No user-facing error/success strings in the service (all strings are `Logger` diagnostics, not returned to users); rule applies to 2+ user-facing strings, so N/A. |
| 5 | DB access / entity ownership | — | Service touches no DB/entities; persistence delegated to NotificationLog/TenantUsage services. |
| 6 | Multi-tenancy | ✅ | `tenantId` threaded through every call; provider creds resolved per-tenant; no direct queries to mis-scope. |
| 7 | Authorization / RBAC | ✅ | In-service `assertSmsFeatureAccess` gates BOOLEAN `feature_sms_send` + LIMIT `feature_sms_monthly_quota`, re-asserted at worker boundary; root tenant short-circuited. |
| 8 | Service composition | ✅ | Sub-services (NotificationLog, TenantUsage, TenantFeatureGate) imported via facade + `@/` alias; providers behind `BaseSMSProvider`. |
| 9 | Caching | — | No hot read path at the service layer; N/A. |
| 10 | Secrets / config | ✅ | All config via Zod-validated `@/modules/env`; no `process.env` in service. |
| 11 | Logging / audit | ⚠️ | Rich `Logger` diagnostics + fire-and-forget `NotificationLogService.log`; no secret leakage, but no security-audit-log entry for send/block. |
| 12 | Security hardening | ⚠️ | Rate limiting, E.164 parse + validity check, allowed-country gate, quota gate; rate-limit key not tenant-scoped (Low). |
| 13 | Naming / file organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase `SMSService`; `.setting.keys.ts` and `providers/` correctly placed. |

## Recommendations
1. Move `assertSmsFeatureAccess` out of the swallow-all `try/catch` in `sendShortMessage` (or re-throw `AppError`) so plan/quota denials are observable to callers instead of being logged and dropped. (Dimension 3)
2. Tenant-scope the rate-limit Redis key to `sms:rate-limit:{tenantId}:{to}` to remove cross-tenant throttling interference. (Dimension 12)
3. Optionally add an explicit `init()` to avoid import-time Redis connections from the `static {}` block. (Dimension 1)

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `authorization-and-rbac.md`, `multi-tenancy-patterns.md`, `env-and-config.md`, `security-hardening.md`, `code-structure-ts-master.md` · Source: `modules/notification_sms/notification_sms.service.ts`
