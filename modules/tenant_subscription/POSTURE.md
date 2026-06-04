# tenant_subscription — Posture Review

> **Reviewed:** 2026-06-03 against `00_Config_and_AI_Rules`
> **Services:** tenant_subscription.service.ts, tenant_subscription.card.service.ts, tenant_subscription.checkout.service.ts, tenant_subscription.feature.service.ts, tenant_subscription.plan.service.ts, tenant_subscription.platform.service.ts
> **Overall grade:** C · **Findings:** 0c / 2h / 4m / 1l

## Service Inventory
| File | ~LOC | Responsibility |
| --- | --- | --- |
| tenant_subscription.service.ts | 274 | Core lifecycle: assign/cancel plan, grace period, expire-overdue cron, confirmPayment. |
| tenant_subscription.card.service.ts | 262 | Direct raw-card checkout: BIN detection, TRY conversion, auto-3DS, 3DS callback completion. |
| tenant_subscription.checkout.service.ts | 182 | Hosted (redirect) checkout + Stripe Element express-wallet checkout. |
| tenant_subscription.feature.service.ts | 234 | Redis-cached feature gating (check/assert), cache invalidation, default-plan setting. |
| tenant_subscription.plan.service.ts | 265 | Plan + plan-feature CRUD and list/detail reads. |
| tenant_subscription.platform.service.ts | 133 | Root-admin clone of a ROOT-catalogue plan chain into a target tenant, then free assign. |

## Findings

### 🟠 High

- **[Dimension 3 — Error handling] Raw `throw new Error(...)` everywhere instead of `AppError`** — 46 raw `new Error(SUBSCRIPTION_MESSAGES.X)` throws (or an inline string) across the six services, so a route handler cannot derive an HTTP status or `ErrorCode`; a 404 (PLAN_NOT_FOUND), a 409 (ALREADY_CANCELLED), and a 500 (_FAILED) are all indistinguishable at the boundary. `AppError`/`ErrorCode` exist at `modules/common/app-error.ts` and are the required throw type; the module imports neither. Evidence: `tenant_subscription.service.ts:43` (PLAN_NOT_FOUND → 404), `:123`,`:158`,`:229` (NOT_FOUND → 404), `:124` (ALREADY_CANCELLED → 409), `:159` (NOT_PAST_DUE → 409), `:249`,`:253`,`:260` (payment state → 409/422), `:103`,`:133`,`:172`,`:216` (failure wrappers → 500); `tenant_subscription.plan.service.ts:79`,`:114`,`:120`,`:149`,`:160`,`:198`,`:215`,`:226`,`:240`; `tenant_subscription.feature.service.ts:213`,`:229`; `tenant_subscription.card.service.ts:50`,`:139`,`:205`,`:216`,`:253`; `tenant_subscription.checkout.service.ts:44`,`:99`,`:124`,`:169`,`:173`,`:177`; `tenant_subscription.platform.service.ts:35`,`:41`. Rule: `error-handling-and-app-error.md`. Fix: `import { AppError, ErrorCode } from "@/modules/common/app-error"` and throw `new AppError(SUBSCRIPTION_MESSAGES.X, <status>, ErrorCode.X)` per case (NOT_FOUND→404, conflict→409, validation→422, generic _FAILED→500).

- **[Dimension 6 — Multi-tenancy] `deletePlan` counts active subscriptions on the wrong DataSource** — The plan is loaded via `tenantDataSourceFor(tenantId)` (`:112`), but the guard that blocks deletion of a plan with active subscriptions queries the system DataSource via `getDataSource()` (`:116-119`). For a tenant on a separate physical database, `getDataSource()` is the wrong DB (per `tenantDataSourceFor` in `modules/db/db.ts:180-202` a tenant with its own `TenantDatabase` row gets a distinct DataSource), so the count returns 0 and the guard is silently bypassed — a plan still backing active subscriptions can be deleted. The `tenantId` filter is present (no cross-tenant leak), but the read targets the wrong DataSource, a data-integrity defect. Evidence: `tenant_subscription.plan.service.ts:116` (`const tenantDs = await getDataSource();`) vs `:112`. Rule: `multi-tenancy-patterns.md`. Fix: query the count via `tenantDataSourceFor(tenantId)` (the same DataSource used to load the plan); the misleading local name `tenantDs` for the system source should also be corrected.

### 🟡 Medium

- **[Dimension 4 — Messages] Hardcoded inline user-facing strings bypassing the messages file** — Five throws use prose literals instead of `SUBSCRIPTION_MESSAGES`. Evidence: `tenant_subscription.feature.service.ts:59` ("This plan references a deleted product…"), `:62` ("Only a free plan (base price 0)…"); `tenant_subscription.platform.service.ts:35` ("Cannot assign a platform plan to the root tenant itself"), `:41` ("Source platform plan references a deleted product."); `tenant_subscription.helpers.ts:31` ("Product not found for plan."). Rule: `module-messages-pattern.md`. Fix: add keys to `tenant_subscription.messages.ts` and reference them. (Note: a related `PLATFORM_PLAN_ONLY_ROOT` key exists at `tenant_subscription.messages.ts:21` but its prose — "Only root-tenant plans can be assigned to other tenants" — is semantically different from the `:35` root-self guard, so it is not a drop-in replacement; add a dedicated key instead.)

- **[Dimension 5 — DB access] Multi-write plan clone has no transaction** — `assignPlatformPlan` performs a 4-entity write chain (find-or-create category, find-or-create product, find-or-create plan, delete+re-insert all features) across four repositories with no transaction (`:47-121`). A failure after the `featRepo.delete(...)` at `:110` but before the feature re-insert leaves the target tenant's plan with its features wiped and not restored. Evidence: `tenant_subscription.platform.service.ts:47-127`. Rule: `database-patterns.md`. Fix: wrap the clone in `ds.transaction(async (m) => …)` and use the transactional manager's repositories.

- **[Dimension 6 — Multi-tenancy] `expireOverdueSubscriptions` scans only the system DataSource** — The cron uses `getDataSource()` to find PAST_DUE rows across all tenants in one query (`:196-205`). This is intentional (no `tenantId` in scope, a system-wide cron read) and correct on a single shared DB, but on a per-tenant-DB deployment it silently skips every tenant on a separate physical database. Evidence: `tenant_subscription.service.ts:196`. Rule: `multi-tenancy-patterns.md`. Fix: iterate tenants and scan each via `tenantDataSourceFor(tenant.tenantId)`, or document that overdue-expiry is single-DB-only.

- **[Dimension 5 — DB access] Force-unwrapped re-read after `update`** — After `repo.update(...)`, the row is re-read with `findOne(...)` and force-unwrapped with `!` before the Safe-schema parse (`:77`, `:128`/`:130`, `:166`/`:169`, `:236`/`:237`). A concurrent delete makes this throw an opaque `TypeError`/Zod error rather than a typed `SUBSCRIPTION_NOT_FOUND`. Evidence: `tenant_subscription.service.ts:77`,`:130`,`:169`; `tenant_subscription.plan.service.ts:237`. Rule: `database-patterns.md`. Fix: null-check the re-read and throw the appropriate (typed) error.

### 🔵 Low

- **[Dimension 2 — Boundary validation] Redundant re-parse of an already-validated object** — In `confirmPayment`, the COMPLETED-idempotency branch manually re-lists every field from `existing` (already a validated `TenantSubscriptionWithPlan` from `getSubscription`) and re-parses it through `TenantSubscriptionSchema` (`:235-247`). It works but is needless churn. Evidence: `tenant_subscription.service.ts:235-247`. Rule: `validation-philosophy.md`. Fix: return the already-validated object (or a typed projection) directly instead of rebuilding and re-parsing.

## Rule Compliance Matrix
| # | Dimension | Status | Notes |
| --- | --- | :---: | --- |
| 1 | Static service class | ✅ | All six are static-only classes, single default export, never instantiated. |
| 2 | Boundary validation | ✅ | DB output parsed through `Safe*Schema` everywhere; service trusts typed DTOs. One Low redundant re-parse. |
| 3 | Error handling | ❌ | 46 raw `new Error` throws, zero `AppError` — route layer cannot derive status/code. |
| 4 | Messages pattern | ⚠️ | Mostly `SUBSCRIPTION_MESSAGES`, but 5 inline hardcoded strings. |
| 5 | DB access / ownership | ⚠️ | Entities in module/payment folders, null-checked finds, no raw SQL; but multi-write clone lacks a transaction and re-reads are force-unwrapped. |
| 6 | Multi-tenancy | ❌ | `deletePlan` counts on system DataSource (wrong DB); `expireOverdueSubscriptions` is single-DB-only. tenantId filters present (no cross-tenant leak). |
| 7 | Authorization / RBAC | ⚠️ | authz enforced at route layer; resource-level check not in service (deviation from authorization-and-rbac.md). Feature gating itself lives here and is sound. |
| 8 | Composition / boundaries | ✅ | Facade core + sub-services; cross-module imports via `@/` alias; webhook/setting loaded by lazy import to break cycles. |
| 9 | Caching | ✅ | Feature cache fails open (`get`/`set`/`del` swallow errors). No singleFlight/jitter, but read path is not hot enough to require it. |
| 10 | Secrets / config | ✅ | No `process.env` reads; grace-period + default-plan config via `SettingService`. |
| 11 | Logging / audit | ⚠️ | Feature-access audit-logged fire-and-forget; webhooks emitted. But assign/cancel/expire/platform-clone are not audit-logged. |
| 12 | Security hardening | ✅ | Express/3DS verified server-side (never trusts client); card PAN/CVV not logged; `confirmPayment` idempotent. |
| 13 | Naming / file organization | ✅ | snake_case module, kebab-case files, PascalCase classes, correct `.service/.dto/.types/.enums/.messages` suffixes. |

## Recommendations
1. **(High)** Replace every `throw new Error(...)` with `throw new AppError(message, status, ErrorCode.X)` so HTTP semantics survive to the route. Map: NOT_FOUND→404; ALREADY_CANCELLED/NOT_PAST_DUE/PAYMENT_INVALID_STATUS→409/422; generic `*_FAILED`→500.
2. **(High)** Fix `deletePlan` to count active subscriptions via `tenantDataSourceFor(tenantId)`, not `getDataSource()`, so the deletion guard is honoured on per-tenant databases.
3. **(Medium)** Wrap the `assignPlatformPlan` clone (category/product/plan/feature delete+insert) in a single `ds.transaction(...)` to avoid partial state on failure.
4. **(Medium)** Move the 5 inline strings into `tenant_subscription.messages.ts` (add dedicated keys; do not overload the semantically distinct `PLATFORM_PLAN_ONLY_ROOT`).
5. **(Medium)** Make `expireOverdueSubscriptions` iterate tenant DataSources, or document it as single-DB-only.
6. **(Medium)** Audit-log assign/cancel/expire/platform-clone fire-and-forget for a complete billing trail.
7. **(Low)** Drop the redundant schema re-parse in `confirmPayment`'s COMPLETED branch.

## References
- Rules: error-handling-and-app-error.md, multi-tenancy-patterns.md, database-patterns.md, module-messages-pattern.md, authorization-and-rbac.md, caching-patterns.md, validation-philosophy.md · Source: tenant_subscription.service.ts, tenant_subscription.card.service.ts, tenant_subscription.checkout.service.ts, tenant_subscription.feature.service.ts, tenant_subscription.plan.service.ts, tenant_subscription.platform.service.ts
