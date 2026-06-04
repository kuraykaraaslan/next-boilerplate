# notification_inapp — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `notification_inapp.service.ts`
> **Overall grade:** B · **Findings:** 0c / 0h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `notification_inapp.service.ts` | 172 | Redis-backed per-user in-app notification feed: push (single/users/role/admins/all), list, unread count, mark read, delete, clear. Fans out to push notifications and pub/sub. |

## Findings

### 🟡 Medium
- **[Dimension 2 — Boundary validation] Cached/store output not run through a Safe schema** — `getAll` does `const n: Notification = JSON.parse(json)` and casts the raw Redis value straight to `Notification` with no validation. A `NotificationSchema` already exists in `notification_inapp.types.ts` but the service imports only the inferred `type` (`import type { Notification, NotificationPayload }`, `:7`), so a malformed/poisoned hash entry flows out untyped. Evidence: `modules/notification_inapp/notification_inapp.service.ts:118`. Rule: `validation-philosophy.md`. Fix: validate each parsed entry with `NotificationSchema.safeParse(...)` and drop entries that fail.
- **[Dimension 8 — Service composition] Cross-module import uses a relative path, not the `@/` alias** — the push sub-service is imported as `'../notification_push/notification_push.service'` instead of an `@/modules/notification_push...` alias import. This reaches across module boundaries with a relative path. Note: `notification_push` exposes no `index.ts` facade, so the concrete `.service` file is the current entry point. Evidence: `modules/notification_inapp/notification_inapp.service.ts:8`. Rule: `import-rules.md`, `service-composition-pattern.md`. Fix: import via the `@/modules/notification_push` alias (ideally add an `index.ts` facade to export the service).
- **[Dimension 11 — Logging and audit] No audit trail or operational logging for mutating broadcasts; push failure swallowed silently** — fan-out operations (`pushToRole` `:82`, `pushToAll` `:103`, `clearAll` `:161`) emit no audit/operational log, and the push-notification side-effect failure is discarded by `.catch(() => {})` (`:69`), so delivery problems are invisible. Evidence: `modules/notification_inapp/notification_inapp.service.ts:69`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: log the swallowed push error fire-and-forget; consider an audit entry for tenant-wide broadcasts.

### 🔵 Low
- **[Dimension 7 — Authorization] No resource-level ownership check in service** — every method trusts the `userId`/`tenantId` it is handed; nothing verifies the caller owns the target feed. Per repo convention this is enforced at the route layer, so it is a documented deviation rather than a defect. Evidence: `modules/notification_inapp/notification_inapp.service.ts:132,150` (mark/delete by id). Rule: `authorization-and-rbac.md`. Fix: optionally assert the caller's userId matches the target in route handlers; no in-service change required.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Single default-exported class, all-static methods, never instantiated. |
| 2 | Boundary validation | ⚠️ | `NotificationSchema` exists but parsed Redis output is cast, not validated (`:118`). |
| 3 | Error handling | ✅ | No raw `throw new Error`; methods return empty/no-op on missing data, no error paths needed. |
| 4 | Messages pattern | ✅ | No hardcoded user-facing strings in service; `notification_inapp.messages.ts` present. |
| 5 | DB access and entity ownership | ✅ | DB only in service via `tenantDataSourceFor`; `TenantMember` imported from its module entities; no raw SQL. |
| 6 | Multi-tenancy | ✅ | Every Redis key and `TenantMember` query includes `tenantId`; tenant DataSource used (`:87,104`). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). |
| 8 | Service composition and boundaries | ⚠️ | Cross-module push service imported via relative path, not `@/` alias (`:8`). |
| 9 | Caching | — | Redis is the store of record here, not a cache over a DB; singleFlight/negative-cache/jitter/fail-open patterns do not apply. |
| 10 | Secrets and config | ✅ | No `process.env`; Redis/db obtained from `@/modules/redis` and `@/modules/db`. |
| 11 | Logging and audit | ⚠️ | Mutating broadcasts and swallowed push failure (`:69`) are silent. |
| 12 | Security hardening | ✅ | Tenant-scoped keys prevent cross-tenant leakage; bounded `MAX_PER_USER`; TTL on keys; no injection surface. |
| 13 | Naming and file organization | ✅ | snake_case module, kebab/dot file suffixes, PascalCase class, correct `.service.ts`/`.types.ts`/`.messages.ts`. |

## Recommendations
1. Validate parsed Redis entries through `NotificationSchema.safeParse` in `getAll`; discard entries that fail rather than casting raw JSON (`:118`).
2. Switch the cross-module dependency to an `@/modules/notification_push` alias import (`:8`); add an `index.ts` facade to `notification_push` to export the service cleanly.
3. Log the swallowed push-notification failure fire-and-forget and add audit entries for tenant-wide broadcasts (`:69,103`).

## References
- Rules: `validation-philosophy.md`, `import-rules.md`, `service-composition-pattern.md`, `logging-monitoring-and-audit-trails.md`, `authorization-and-rbac.md`, `multi-tenancy-patterns.md` · Source: `modules/notification_inapp/notification_inapp.service.ts`, `notification_inapp.types.ts`, `notification_inapp.messages.ts`
