# payment_subscription

Tenant-scoped subscription billing: plans, features, and Subscription state.

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

## Entities

- `SubscriptionPlan` — `planId`, `tenantId`, `productId`, `interval` (DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY), `trialDays`, `status`, timestamps. Price comes from `product.basePrice`.
- `PlanFeature` — capability rows attached to a plan (`key`, `label`, `type=BOOLEAN|LIMIT`, `value`).
- `Subscription` — provider state (status, `billingCycle` snapshot of plan's interval, current period, trial, cancellation, metadata).

## Admin UI

- `/tenant/<id>/admin/plans` — list of plans (joined product columns for name/price/currency). "New Plan" modal picks an existing product via search, then sets monthly/yearly/trial.
- `/tenant/<id>/admin/plans/<planId>` — detail page: "Wrapped Product" card with link to product editor, "Pricing & Status" card for plan-specific fields, "Features" table for capability flags, "Change product" modal to rebind.

The product picker reuses the same search-as-you-type pattern as the Store variant-link picker.

## Service shape

```ts
PaymentSubscriptionService.createPlan(tenantId, { productId, interval, trialDays?, status? }) → PlanWithProduct
PaymentSubscriptionService.updatePlan(tenantId, planId, partial) → PlanWithProduct
PaymentSubscriptionService.getPlan(tenantId, planId, withFeatures?) → PlanWithProduct | PlanWithFeatures
PaymentSubscriptionService.listPlans(tenantId, { page, pageSize, status?, includeFeatures? }) → { data, total }
```

`PlanWithProduct` always embeds the product summary so admin tables don't need a second roundtrip. `PlanWithFeatures` extends it with the feature list.

## Price & currency derivation

Both **amount** and **currency** flow from the wrapped product (`product.basePrice`, `product.currency`). On `createSubscription` you can override the currency explicitly; otherwise it follows the product. `billingCycle` on a Subscription is a snapshot of the plan's `interval` taken at subscribe time (so changing the plan later doesn't rewrite history).

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

**Tenant seed:** `TenantService.seedDefaults` previously auto-created a "Free" plan for every new tenant. That seed is currently disabled — a plan now requires both a `Category` and a `StoreProduct`, and the catalog is tenant-specific. Operators create the Free plan via the admin UI once their catalog is in place.

## Dependencies

`db`, `env`, `redis`, `logger`, `store` (entity import for product join).
