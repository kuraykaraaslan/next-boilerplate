# Payment Subscription

- **id:** `payment_subscription`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_subscription/`
- **tags:** payment, subscription, billing, plans
- **icon:** `fas fa-sync-alt`
- **hasNextLayer:** true

Recurring subscription lifecycle: plans, plan features, subscriber management, proration, billing cycle tracking. Provider-agnostic (Stripe, PayPal, Iyzico, …). Tenant-aware — every plan and subscription is scoped to a tenant.

## Dependencies

- **requires:** `db`, `env`, `setting`, `redis`, `logger`, `payment_core`

## Services

- `payment_subscription.crud.service.ts`
- `payment_subscription.dunning.service.ts`
- `payment_subscription.event.service.ts`
- `payment_subscription.lifecycle.service.ts`
- `payment_subscription.line.service.ts`
- `payment_subscription.metered.service.ts`
- `payment_subscription.metrics.service.ts`
- `payment_subscription.plan.service.ts`
- `payment_subscription.proration.service.ts`
- `payment_subscription.service.ts`
- `payment_subscription.transitions.service.ts`

## DTOs

- `payment_subscription.dto.ts`

## Entities

- `plan_feature.entity.ts`
- `subscription.entity.ts`
- `subscription_event.entity.ts`
- `subscription_plan.entity.ts`

## Enums

- `payment_subscription.enums.ts`

## Message keys

- `payment_subscription.messages.ts`

## TypeORM entities

- `PlanFeature` (system) — `modules/payment_subscription/server/entities/plan_feature.entity.ts`
- `Subscription` (system) — `modules/payment_subscription/server/entities/subscription.entity.ts`
- `SubscriptionEvent` (system) — `modules/payment_subscription/server/entities/subscription_event.entity.ts`
- `SubscriptionPlan` (system) — `modules/payment_subscription/server/entities/subscription_plan.entity.ts`

## Next layer (modules_next/) surface

- `payment_subscription/ui/subscription-events-panel.component` _(ui, client)_
- `payment_subscription/ui/subscription-lines-panel.component` _(ui, client)_
- `payment_subscription/ui/subscription-status-badge.component` _(ui, client)_
- `payment_subscription/ui/subscriptions-subscription-id.page` _(ui, client)_
- `payment_subscription/ui/subscriptions.page` _(ui, client)_

## README

# Payment Subscription Module

Tenant-scoped subscription billing: plans (each wrapping a `StoreProduct`), plan-feature flags, and provider-agnostic Subscription lifecycle state with proration. Every plan, feature, and subscription is isolated by `tenantId` in the tenant DB.

---

## Plans wrap products

A **Plan** is a billing-recurrence binding around a `StoreProduct`. The product owns presentation **and price** (name, slug, description, `basePrice`, currency, imagery, SEO). The plan owns recurrence (`interval`, trial, status).

To offer the same product at multiple cadences (e.g. "Pro Monthly" vs "Pro Yearly"), create **multiple plans** that point to the same product. The interval is part of each plan's identity.

```
StoreProduct (modules/store)
   ▲
   │ productId FK
   │
SubscriptionPlan          ← name, description, currency come from the product
   ▲
   │ planId FK
   │
Subscription              ← per-tenant or per-user billing state
```

This means coupons, invoices, the storefront cart, and the admin product catalog all operate over a single notion of "what is being sold". One-time products and recurring plans are both reachable from the same product record.

---

## Entities

All three tables live in the **tenant DB** (reached via `tenantDataSourceFor(tenantId)`) and are isolated by `tenantId`.

| Entity | Table | Description |
|---|---|---|
| `SubscriptionPlan` | `subscription_plans` | `planId`, `tenantId`, `productId` (FK into `store_products`), `interval` (DAILY \| WEEKLY \| MONTHLY \| QUARTERLY \| YEARLY), `trialDays`, `status` (ACTIVE \| ARCHIVED \| DRAFT), timestamps. Price is sourced from `product.basePrice`. |
| `PlanFeature` | `plan_features` | Capability row attached to a plan: `key`, `label`, `type` (BOOLEAN flag \| LIMIT quota), `value`, `sortOrder`. Unique on `(tenantId, planId, key)`. |
| `Subscription` | `subscriptions` | Provider billing state: `userId?`, `planId`, `provider`, `providerSubscriptionId?`, `providerCustomerId?`, `status` (TRIALING \| ACTIVE \| PAST_DUE \| PAUSED \| CANCELLED \| EXPIRED \| INCOMPLETE), `billingCycle` (snapshot of plan interval), `amount`, `currency`, trial/period dates, cancellation fields, pause fields, `pastDueCount`, `metadata` (jsonb). Soft-deletable. |

The `PlanFeatureTypeEnum` is **re-exported** (not redefined) from `tenant_subscription`, which reads the same `plan_features` table — a single source of truth prevents the value set from drifting between the two modules.

---

## Services

### `PaymentSubscriptionService` (`payment_subscription.service.ts`)

Static service; every method takes `tenantId` first and resolves a tenant DataSource. Plan reads and per-plan/subscription lookups are Redis single-flighted; mutations bust the relevant `sub:*` cache keys.

**Plans**

| Method | Responsibility |
|---|---|
| `createPlan(tenantId, dto)` | Validate the wrapped product exists, persist the plan, return a `PlanWithProduct` (plan + embedded product summary). |
| `updatePlan(tenantId, planId, dto)` | Patch plan fields; re-validates the product if `productId` changes. |
| `getPlan(tenantId, planId, withFeatures?)` | Fetch one plan; embeds product summary, optionally the feature list. |
| `listPlans(tenantId, query)` | Paginated list (`status`, `includeFeatures` filters); batch-joins products (and features) to avoid N+1. |
| `deletePlan(tenantId, planId)` | Soft-delete; **refuses** if any `ACTIVE` subscription references the plan. |

`PlanWithProduct` always embeds the product summary so admin tables don't need a second roundtrip. `PlanWithFeatures` extends it with the feature list.

**Features**

| Method | Responsibility |
|---|---|
| `upsertFeature(tenantId, planId, dto)` | Create or update a feature row keyed by `(tenantId, planId, key)`. |
| `deleteFeature(tenantId, planId, featureId)` | Remove a feature row. |

**Subscriptions**

| Method | Responsibility |
|---|---|
| `createSubscription(tenantId, dto)` | Derive `billingCycle` from the plan interval, `amount`/`currency` from the wrapped product, and the trial window from `plan.trialDays`; set status to `TRIALING` or `ACTIVE`; dispatch `subscription.created`. |
| `getSubscription(tenantId, subscriptionId, withPlan?)` | Fetch one subscription, optionally with its plan + product + features. |
| `listSubscriptions(tenantId, query)` | Paginated list filtered by `userId` / `planId` / `status` / `provider`. |
| `cancelSubscription(tenantId, id, dto)` | Cancel now or at period end; dispatch `subscription.cancelled`. |
| `pauseSubscription(tenantId, id, dto)` | Pause an ACTIVE/TRIALING subscription (optional `pausedUntil`); dispatch `subscription.paused`. |
| `resumeSubscription(tenantId, id)` | Resume a PAUSED subscription; dispatch `subscription.resumed`. |
| `changePlan(tenantId, id, dto)` | Re-derive amount/currency/cycle from the target plan/product; optionally re-base the current period (proration); dispatch `subscription.updated`. |
| `prorationPreview(tenantId, id, dto)` | Compute a `ProrationPreview` for a prospective plan change without mutating state. |
| `checkFeature(tenantId, id, key)` | Resolve feature access for an ACTIVE/TRIALING subscriber: BOOLEAN → `value === 'true'`, LIMIT → allowed with the quota value. |

### `ProrationService` (`payment_subscription.proration.service.ts`)

- `preview(currentAmount, newAmount, cycle, periodStart, periodEnd, currency)` — credit the unused fraction of the current period against the new cycle charge, returning `{ unusedCredit, newCycleCharge, immediateCharge, currency, prorationDate }`.
- `nextPeriodEnd(from, cycle)` — advance a date by one billing cycle (calendar-correct for MONTHLY/QUARTERLY/YEARLY).
- `CYCLE_DAYS` — approximate days-per-cycle constants (DAILY=1, WEEKLY=7, MONTHLY=30, QUARTERLY=91, YEARLY=365).

---

## Price & currency derivation

Both **amount** and **currency** flow from the wrapped product (`product.basePrice`, `product.currency`). On `createSubscription` you can override the currency explicitly; otherwise it follows the product. `billingCycle` on a Subscription is a snapshot of the plan's `interval` taken at subscribe time (so changing the plan later doesn't rewrite history).

---

## Events

Subscription lifecycle methods dispatch tenant-scoped webhook events via `WebhookService.dispatchEvent` (fire-and-forget, after commit):

| Event | Dispatched by |
|---|---|
| `subscription.created` | `createSubscription` |
| `subscription.cancelled` | `cancelSubscription` |
| `subscription.paused` | `pauseSubscription` |
| `subscription.resumed` | `resumeSubscription` |
| `subscription.updated` | `changePlan` |

All five are registered in `modules/webhook/webhook.catalog.ts` under the *Subscriptions* group.

---

## Admin UI

The plan/feature catalog is intended to be managed through the tenant admin Plans pages:

- Plans list — joined product columns for name/price/currency; a "New Plan" modal picks an existing product via search, then sets cadence/trial.
- Plan detail — "Wrapped Product" card with a link to the product editor, "Pricing & Status" card for plan-specific fields, a "Features" table for capability flags, and a "Change product" modal to rebind.

The product picker reuses the same search-as-you-type pattern as the Store variant-link picker.

> Note: the live tenant Plans/Subscription HTTP routes under `app/tenant/[tenantId]/api/plans` and `.../api/subscription` are currently served by the older `tenant_subscription` module (same `subscription_plans` / `plan_features` tables). `PaymentSubscriptionService` is the service-layer surface for this module; it is consumed directly rather than through dedicated routes.

---

## Migration notes

The legacy `modules/payment/entities/subscription_plan.entity.ts` and `modules/payment_subscription/entities/subscription_plan.entity.ts` both target the same `subscription_plans` table. Both have been updated to the same shape so either registration works.

Schema changes:

```sql
-- drop legacy plan-owned display fields and per-cadence prices
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "name";
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "description";
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "currency";
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "sortOrder";
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "monthlyPrice";
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "yearlyPrice";
ALTER TABLE subscription_plans DROP COLUMN IF EXISTS "isDefault";

-- add the product binding and the recurrence interval
ALTER TABLE subscription_plans ADD COLUMN "productId" uuid;
ALTER TABLE subscription_plans ADD COLUMN "interval"  varchar DEFAULT 'MONTHLY';
-- backfill: for each existing plan, create or pick a StoreProduct (basePrice=monthlyPrice)
-- and set productId. For plans that had both monthly+yearly amounts, split into TWO plans.
ALTER TABLE subscription_plans ALTER COLUMN "productId" SET NOT NULL;
ALTER TABLE subscription_plans ALTER COLUMN "interval"  SET NOT NULL;
```

In dev (TypeORM `synchronize`) the columns drop/add automatically. In prod, backfill before tightening the constraints.

**Tenant seed:** `TenantService.seedDefaults` previously auto-created a "Free" plan for every new tenant. That seed is currently disabled — a plan now requires both a `Category` and a `StoreProduct`, and the catalog is tenant-specific. Operators create the Free plan via the admin UI once their catalog is in place. The demo seed (`payment_subscription.seed.ts`) provisions sample plans, features, and subscriptions for development.

---

## Settings

This module declares a dependency on the `setting` module but **reads no setting keys** — its entire config surface lives as per-tenant DB rows (plans, features). There are no per-module setting keys today.

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Tenant-scoped subscription billing module (plans wrapping store products, plan-feature flags, and subscription lifecycle state) whose entire config surface lives as per-tenant DB rows read via tenantDataSourceFor(tenantId); it declares the setting dependency but reads no setting keys.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `SubscriptionPlan` | `subscription_plans` | productId, interval, trialDays, status |
| `PlanFeature` | `plan_features` | planId, key, label, type, value, sortOrder |
| `Subscription` | `subscriptions` | userId, planId, provider, providerSubscriptionId, providerCustomerId, status, billingCycle, amount, currency, trialEndsAt, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, cancellationReason, pausedUntil, metadata |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `payment_subscription.service.ts:createSubscription` — Each tenant defines its own plans (subscription_plans rows); subscribing reads the tenant's plan to derive billingCycle from plan.interval, amount/currency from the tenant's wrapped StoreProduct (product.basePrice/currency), and the trial window from the tenant-configured plan.trialDays. So trial length, cadence, price and currency all differ per tenant per plan.
- `payment_subscription.service.ts:checkFeature` — Feature gating is driven by the tenant's own plan_features rows (key/type/value) attached to the subscription's plan, so which capabilities a subscriber is granted is fully per-tenant and per-plan.
- `payment_subscription.service.ts:changePlan` — Plan-change re-derives amount/currency/billingCycle from the tenant's target plan and product, and prorates against the tenant's own current-period dates, so upgrade/downgrade economics vary per tenant catalog.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Proration cycle-length denominators (DAILY=1, WEEKLY=7, MONTHLY=30, QUARTERLY=91, YEARLY=365) used to compute unused-credit fractions | `payment_subscription.proration.service.ts:CYCLE_DAYS / ProrationService.preview` | These approximate billing-period lengths drive how much credit a customer gets on a mid-cycle plan change; a tenant may want exact calendar months or a different proration convention, but the values are a hardcoded global constant with no per-tenant override. | `subscriptionProrationCycleDays` |
| Proration is always enabled by DTO default (prorate defaults to true) with no tenant-level policy | `payment_subscription.dto.ts:ChangePlanDTO / service.changePlan` | Whether plan changes prorate vs. charge full price is a billing policy that often varies per tenant/merchant, but it is only a per-request default with no tenant-configurable setting to enforce a house policy. | `subscriptionProrateOnPlanChange` |
| Default cancellation behavior (cancelAtPeriodEnd defaults to true) | `payment_subscription.dto.ts:CancelSubscriptionDTO` | Some tenants want immediate cancellation by default rather than cancel-at-period-end; today the default is a hardcoded DTO value with no per-tenant override. | `subscriptionCancelAtPeriodEndDefault` |
| Fallback currency 'USD' and default subscription/plan status values baked into entities | `subscription.entity.ts (currency default 'USD', status default 'TRIALING', billingCycle default 'MONTHLY') and createSubscription currency fallback to product.currency` | A tenant operating in a single non-USD market would benefit from a tenant default currency/cadence rather than the global 'USD'/'MONTHLY' column defaults; currently only overridable per-request, falling back to product or hardcoded column defaults. | `subscriptionDefaultCurrency` |
| No past-due / dunning grace policy despite a pastDueCount column existing | `subscription.entity.ts:pastDueCount (column present, never written by the service)` | Grace-period length and how many failed payments before forced cancellation is a classic per-tenant dunning policy; the column exists but there is no setting or logic, so the policy is effectively absent/global. | `subscriptionPastDueGraceCount` |

---

## Dependencies

`db`, `env`, `setting`, `redis`, `logger`, `payment_core` (provider/currency enums). Also imports the `store` module's `StoreProduct` entity for the product join, and `webhook` (`WebhookService`) to dispatch subscription lifecycle events.
