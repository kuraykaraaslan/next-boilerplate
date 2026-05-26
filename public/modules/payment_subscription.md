# Payment Subscription

- **id:** `payment_subscription`
- **tier:** other
- **version:** 1.0.0
- **dir:** `modules/payment_subscription/`
- **tags:** payment, subscription, billing, plans
- **icon:** `fas fa-sync-alt`
- **hasNextLayer:** false

Recurring subscription lifecycle: plans, plan features, subscriber management, proration, billing cycle tracking. Provider-agnostic (Stripe, PayPal, Iyzico, …). Tenant-aware — every plan and subscription is scoped to a tenant.

## Dependencies

- **requires:** `db`, `env`, `setting`, `redis`, `logger`, `payment_core`

## Services

- `payment_subscription.proration.service.ts`
- `payment_subscription.service.ts`

## DTOs

- `payment_subscription.dto.ts`

## Entities

- `plan_feature.entity.ts`
- `subscription.entity.ts`
- `subscription_plan.entity.ts`

## Enums

- `payment_subscription.enums.ts`

## Message keys

- `payment_subscription.messages.ts`

## TypeORM entities

- `PlanFeature` (system) — `modules/payment_subscription/entities/plan_feature.entity.ts`
- `Subscription` (system) — `modules/payment_subscription/entities/subscription.entity.ts`
- `SubscriptionPlan` (system) — `modules/payment_subscription/entities/subscription_plan.entity.ts`
