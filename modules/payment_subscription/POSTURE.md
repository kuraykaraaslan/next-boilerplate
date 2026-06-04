# payment_subscription — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** `payment_subscription.service.ts`, `payment_subscription.proration.service.ts`
> **Overall grade:** C · **Findings:** 0c / 1h / 3m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| `payment_subscription.service.ts` | 439 | CRUD for plans, plan features, and subscriptions; lifecycle (cancel/pause/resume/changePlan); proration preview; feature access checks; webhook dispatch on lifecycle events. |
| `payment_subscription.proration.service.ts` | 51 | Pure date/amount math helper: proration preview computation and next-period-end calculation. No DB or I/O. |

## Findings

### 🟠 High
- **[Dimension 3 — Error handling] Raw `Error` thrown throughout instead of `AppError`** — Every failure path throws `new Error(...)` rather than `new AppError(message, statusCode, ErrorCode.X)`. A route handler cannot derive an HTTP status (404 vs 409 vs 500) from these, so all surface as 500. Affects not-found, conflict, and create-failure paths. Evidence: `payment_subscription.service.ts:49,67,75,96,132,156,172,211,253,261,264,300,301,326,327,348,349,372,375,408,410`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw e.g. `new AppError(SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND, 404, ErrorCode.NOT_FOUND)`, `…ALREADY_CANCELLED, 409, ErrorCode.CONFLICT`, create-failures `500, ErrorCode.INTERNAL_ERROR`.

### 🟡 Medium
- **[Dimension 4 — Messages pattern] Hardcoded inline user-facing strings** — Three messages are inline string literals in the service instead of `payment_subscription.messages.ts` (which already exists and is used elsewhere). Evidence: `payment_subscription.service.ts:49` (`'Product not found for plan.'`), `:132` and `:156` (`` `Plan ${r.planId} references missing product ${r.productId}` ``). Rule: `module-messages-pattern.md`. Fix: add `PRODUCT_NOT_FOUND_FOR_PLAN` / `PLAN_REFERENCES_MISSING_PRODUCT` to `SUBSCRIPTION_MESSAGES` and reference them.
- **[Dimension 7 — Authorization / RBAC] No resource-level ownership check in service** — Services trust the `tenantId` argument and perform no in-service ownership/role check (e.g. `getSubscription`, `cancelSubscription`, `checkFeature` operate on any `subscriptionId` within the tenant with no `userId` ownership assertion). Per grounding facts this is WARN: authz enforced at route layer; resource-level check not in service (deviation from `authorization-and-rbac.md`). No cross-tenant risk since every query is `tenantId`-filtered. Rule: `authorization-and-rbac.md`. Fix: if subscriptions are user-owned, add an optional ownership assertion in user-facing read/mutate paths.
- **[Dimension 11 — Logging and audit] No audit trail for mutating operations** — Plan/feature/subscription create, update, delete, cancel, pause, resume, and changePlan are billing-significant mutations but emit no audit-log entry. `Logger.error` fires only on failure (`:66,252`); webhook dispatch is an integration event, not an audit record. Evidence: `payment_subscription.service.ts:53-178,208-401`. Rule: `logging-monitoring-and-audit-trails.md`. Fix: fire-and-forget an `AuditLogService` entry on each successful mutation; no secrets in payload.

### 🔵 Low
- **[Dimension 9 — Caching] Cache invalidation key duplication / fragility** — Reads use `singleFlight(\`sub:plan:${planId}:${withFeatures}\`)` and mutations manually `redis.del` four hand-listed key permutations (`:true`/`:false` plus bare). The bare `sub:plan:${planId}` and `sub:plans:${tenantId}` keys deleted in `updatePlan`/`deletePlan` are never produced by any reader (`getPlan` only writes `:true`/`:false`; `listPlans` is uncached), so several `del`s are dead and the scheme is easy to drift. Evidence: `payment_subscription.service.ts:60,82-85,174-177,194,201` vs readers `:93,258`. Rule: `caching-patterns.md`. Fix: centralize cache-key construction in one helper and invalidate only keys that are actually produced. Fail-open and jitter are otherwise correct; not a correctness bug.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | Both classes: only static methods, single `default export`, never instantiated. |
| 2 | Boundary validation | ✅ | Service trusts typed DTOs; all DB output filtered through `Safe*Schema.parse` before return; no ad-hoc validation. |
| 3 | Error handling | ❌ | Raw `new Error(...)` everywhere instead of `AppError` + `ErrorCode`; statusCode unrecoverable at route. |
| 4 | Messages pattern | ⚠️ | Uses `SUBSCRIPTION_MESSAGES` const-object, but three inline string literals remain (`:49,132,156`). |
| 5 | DB access & entity ownership | ✅ | DB only in service; entities under `entities/`; `findOne` null-checked; no raw SQL; single-write ops need no tx. |
| 6 | Multi-tenancy | ✅ | All tenant-entity queries use `tenantDataSourceFor(tenantId)` and filter by `tenantId`; no cross-tenant leak. |
| 7 | Authorization / RBAC | ⚠️ | No in-service ownership/role check; authz at route layer (deviation from `authorization-and-rbac.md`). |
| 8 | Service composition & boundaries | ✅ | `ProrationService` and `WebhookService` reached via facade/`@/` alias; cross-module entity via `@/modules/store/...` (established repo pattern); no cycles. |
| 9 | Caching | ⚠️ | `singleFlight` + fail-open used correctly; key/invalidation scheme is duplicated and partly dead (Low). |
| 10 | Secrets & config | ✅ | No `process.env` access; no secrets in service. |
| 11 | Logging & audit | ⚠️ | Failure logging present; no audit-log entries for billing-significant mutations. |
| 12 | Security hardening | ✅ | No SSRF/injection surface; feature `key` regex-validated at DTO; safe message strings; proration is pure math. |
| 13 | Naming & file organization | ✅ | `snake_case` module, kebab/dotted file suffixes, `PascalCase` classes, correct `.service.ts`/`.entity.ts` layout. |

## Recommendations
1. **(High)** Replace every `throw new Error(...)` with `throw new AppError(message, statusCode, ErrorCode.X)` — `NOT_FOUND→404`, `CONFLICT→409` (already-cancelled, has-active-subscribers, not-active), create-failures `INTERNAL_ERROR→500`. Also fix the two catch-block re-throws (`:67,253`) to wrap in `AppError`.
2. **(Medium)** Move the three inline strings (`:49,132,156`) into `payment_subscription.messages.ts`.
3. **(Medium)** Add fire-and-forget audit-log entries to all successful plan/feature/subscription mutations.
4. **(Medium)** Decide and document whether subscription ownership is checked at the route layer; if subscriptions are user-scoped, add an in-service ownership assertion on user-facing paths.
5. **(Low)** Centralize Redis cache-key construction and prune the dead `redis.del` permutations.

## References
- Rules: `error-handling-and-app-error.md`, `module-messages-pattern.md`, `authorization-and-rbac.md`, `logging-monitoring-and-audit-trails.md`, `caching-patterns.md`, `multi-tenancy-patterns.md` · Source: `payment_subscription.service.ts`, `payment_subscription.proration.service.ts`
