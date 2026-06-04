# notification_push — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `notification_push.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 4m / 2l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `notification_push.service.ts` | 198 | Web Push (VAPID) subscription storage + fan-out send (per-user, per-role, per-tenant), with Redis-cached subscription lookups, all tenant-scoped. |

## Findings

### 🟡 Medium
- **[Dimension 3 — Error handling] VAPID misconfiguration is silently swallowed instead of throwing AppError.** `ensureVapid()` forwards `env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!` and `env.VAPID_PRIVATE_KEY!` to `webpush.setVapidDetails`, but both are `z.string().optional()` in env (`modules/env/env.service.ts:84,88`). When unset, `setVapidDetails` is called with `undefined`, mis-initialising the library rather than failing fast. A `VAPID_NOT_CONFIGURED` message already exists in the messages file but is never thrown. Evidence: `modules/notification_push/notification_push.service.ts:22-30`. Rule: `error-handling-and-app-error.md`. Fix: guard in `ensureVapid()` — if either key is missing, `throw new AppError(NotificationPushMessages.VAPID_NOT_CONFIGURED, 500, ErrorCode.X)` (or return early and log) before calling `setVapidDetails`.
- **[Dimension 2 — Boundary validation] DB output is returned without a Safe* schema.** `getSubscriptionsForUser` returns raw `PushSubscriptionEntity[]` (including `p256dh` / `auth` secret material) straight to callers; there is no `Safe*Schema` projection and no `.dto.ts` in the module. Evidence: `modules/notification_push/notification_push.service.ts:47-66`. Rule: `validation-philosophy.md`. Fix: define a `SafePushSubscriptionSchema` (or a DTO) that strips `p256dh`/`auth` for any output that leaves the service boundary; internal send paths can keep the full entity.
- **[Dimension 9 — Caching] Cached payload contains push secret material.** The Redis value for `getSubscriptionsForUser` is `JSON.stringify(subs)` of the full entity, persisting `p256dh`/`auth` keys into Redis. The fail-open mechanics are otherwise correct (singleFlight, `jitter(PUSH_CACHE_TTL)`, `.catch(() => {})` on get/set/del). Evidence: `modules/notification_push/notification_push.service.ts:63`. Rule: `caching-patterns.md`, `secrets-and-configuration-security.md`. Fix: cache only the fields the read path needs (id/endpoint/userId) or the safe projection, not the raw keys.
- **[Dimension 11 — Logging and audit] No audit trail for subscribe/unsubscribe.** Subscription create/update/delete are meaningful state-changing actions but are not audit-logged. Send failures are logged via `Logger.warn/error` (no secret leakage — only `sub.id`/status code), which is fine. Evidence: `modules/notification_push/notification_push.service.ts:68-114`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an audit-log entry on `subscribe` / `unsubscribe` / `unsubscribeByEndpoint`.

### 🔵 Low
- **[Dimension 1 — Static service class] Module-level mutable state outside the class.** The `PushPayload` interface (`:11-16`), `PUSH_CACHE_TTL` / `vapidInitialised`, and `ensureVapid()` live as module-scope functions/vars rather than as private static members of the class. The class itself is correctly all-static with a single default export and is never instantiated. Evidence: `modules/notification_push/notification_push.service.ts:11-30`. Rule: `code-structure-ts-master.md`. Fix: optionally fold the VAPID init flag and helper into private static members for full encapsulation.
- **[Dimension 7 — Authorization / RBAC] No resource-level ownership check in service.** The service trusts the `tenantId`/`userId` it receives and performs no in-service ownership/role check; authz is enforced at the route layer (deviation from `authorization-and-rbac.md`). All queries are correctly tenant-filtered, so there is no IDOR risk. Evidence: `modules/notification_push/notification_push.service.ts:47-114`. Rule: `authorization-and-rbac.md`. Fix: acceptable as a route-layer responsibility; document the trust boundary.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ⚠️ | All-static single default export; but VAPID flag/helper + interface at module scope. |
| 2 | Boundary validation | ⚠️ | No output Safe* schema/DTO; raw entity (with secrets) returned. |
| 3 | Error handling | ⚠️ | Never throws; VAPID-missing path silently mis-inits instead of AppError. Send failures correctly swallowed/logged. |
| 4 | Messages pattern | ✅ | `notification_push.messages.ts` enum present; no hardcoded user-facing strings in service. |
| 5 | DB access & entity ownership | ✅ | DB only in service; entity under `entities/`; no raw SQL; deletes idempotent; no multi-write txn needed. |
| 6 | Multi-tenancy | ✅ | Every query uses `tenantDataSourceFor(tenantId)` and filters by `tenantId`; `TenantMember` query also tenant-scoped. |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition & boundaries | ✅ | Cross-module imports (`@/modules/db`, `@/modules/env`, `@/modules/redis`, `@/modules/logger`, `tenant_member`) via `@/` alias; no cycles. |
| 9 | Caching | ⚠️ | Correct fail-open/singleFlight/jitter, but caches secret key material in Redis. |
| 10 | Secrets & config | ✅ | All config via `@/modules/env`; no `process.env.X` in service. |
| 11 | Logging & audit | ⚠️ | Operational logs OK and no secret leakage; no audit log for subscribe/unsubscribe. |
| 12 | Security hardening | ⚠️ | `env.X!` non-null assertions on optional VAPID keys risk silent mis-init; secrets cached/returned (see D2/D9). |
| 13 | Naming & file organization | ✅ | snake_case module, kebab/snake files, PascalCase class, `.service.ts`/`.entity.ts`/`.messages.ts` suffixes correct. |

## Recommendations
1. Add a fail-fast VAPID guard in `ensureVapid()` that throws `AppError(VAPID_NOT_CONFIGURED, 500, ...)` (or logs and no-ops) when either key is missing, removing the `!` assertions on optional env values.
2. Introduce a `SafePushSubscriptionSchema`/DTO that strips `p256dh`/`auth`, and use it both for any value returned from the service and for the Redis-cached payload so secrets never leave the entity layer.
3. Add fire-and-forget audit-log entries on `subscribe` / `unsubscribe` / `unsubscribeByEndpoint`.
4. (Optional) Encapsulate `vapidInitialised`, `PUSH_CACHE_TTL`, and `ensureVapid()` as private static members of the class.

## References
- Rules: `error-handling-and-app-error.md`, `validation-philosophy.md`, `caching-patterns.md`, `secrets-and-configuration-security.md`, `logging-monitoring-and-audit-trails.md`, `authorization-and-rbac.md`, `code-structure-ts-master.md`, `multi-tenancy-patterns.md` · Source: `modules/notification_push/notification_push.service.ts`, `entities/push_subscription.entity.ts`, `notification_push.messages.ts`
