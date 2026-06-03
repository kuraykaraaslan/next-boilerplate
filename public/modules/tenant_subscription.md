# Tenant Subscription

- **id:** `tenant_subscription`
- **tier:** tenancy
- **version:** 1.0.0
- **dir:** `modules/tenant_subscription/`
- **tags:** tenant, billing
- **icon:** `fas fa-credit-card`
- **hasNextLayer:** true

Tenant subscription state, plan + feature key resolution, grace period, expiry job.

## Dependencies

- **requires:** `db`, `tenant`, `payment`, `redis`, `env`

## Services

- `tenant_subscription.service.ts`

## DTOs

- `tenant_subscription.dto.ts`

## Entities

- `tenant_subscription.entity.ts`

## Enums

- `tenant_subscription.enums.ts`

## Message keys

- `tenant_subscription.messages.ts`

## Setting keys

- `tenant_subscription.setting.keys.ts`

## Jobs

- `tenant_subscription.job.ts`

## TypeORM entities

- `TenantSubscription` (tenant) — `modules/tenant_subscription/entities/tenant_subscription.entity.ts`

## Next layer (modules_next/) surface

- `tenant_subscription/hooks/use-feature-access` _(hook, client)_
- `tenant_subscription/hooks/use-grace-period` _(hook, client)_
- `tenant_subscription/tenant_subscription.grace-period` _(ui)_
- `tenant_subscription/ui/FeatureGate` _(ui, client)_
- `tenant_subscription/ui/GracePeriodBanner` _(ui, client)_
- `tenant_subscription/ui/PlanUsageMeter` _(ui, client)_
- `tenant_subscription/ui/SubscriptionPlanCard` _(ui, client)_
- `tenant_subscription/ui/UpgradePrompt` _(ui, client)_

## README

# Tenant Subscription Module

Manages per-tenant subscription plans, plan features, feature-gating, and self-service / root-admin billing. Each tenant's plan catalogue (plan + product + features) lives in its own datasource; feature access is Redis-cached and audit-logged, and overdue subscriptions are expired by a BullMQ cron worker.

---

## Entities

| Entity | Table | Description |
|---|---|---|
| `TenantSubscription` | `tenant_subscriptions` | The tenant's current subscription (one row per tenant, `@Unique(['tenantId'])`): `planId`, `status`, `billingInterval`, period window, `trialEndsAt`, `cancelledAt`, `gracePeriodEndsAt`. Owned by this module. |
| `SubscriptionPlan` | `subscription_plans` | A plan wrapping a `StoreProduct` (`interval`, `trialDays`, `status`). Entity defined in `modules/payment`; this service reads/writes it. |
| `PlanFeature` | `plan_features` | Per-plan feature row (`key`, `label`, `type`, `value`, `sortOrder`), unique on `(tenantId, planId, key)`. Entity defined in `modules/payment`; this service reads/writes it. |

All three are **tenant-DB** tables, isolated by `tenantId` via the per-tenant DataSource (`tenantDataSourceFor`). The plan/product/feature chain also relies on `StoreProduct` / `StoreCategory` from `modules/store`.

---

## Services / Responsibilities

`TenantSubscriptionService` (static methods):

| Area | Methods |
|---|---|
| Plan CRUD | `createPlan`, `updatePlan`, `deletePlan` (blocks delete with ACTIVE subs), `getPlans`, `getPlanById`, `getPlanWithFeatures`, `getPlansWithFeatures` |
| Feature CRUD | `addFeature`, `updateFeature`, `removeFeature`, `getFeaturesByPlan` |
| Subscription lifecycle | `assignPlan` (derives TRIALING/ACTIVE + period end from the plan), `assignPlatformPlan` (root-only free clone+assign), `getSubscription`, `cancelSubscription` |
| Grace period | `startGracePeriod`, `getGracePeriodStatus`, `expireOverdueSubscriptions` (PAST_DUE past grace → EXPIRED) |
| Payment / checkout | `purchaseSubscription` (hosted redirect), `startExpressCheckout` / `confirmExpressCheckout` (Stripe wallets), `quote` / `payWithCard` / `complete3dsCardPayment` (direct card + 3DS), `confirmPayment` (idempotent activation) |
| Feature gating | `checkFeatureAccess` (non-throwing), `assertFeatureAccess` (throws), `invalidateFeatureCache` |
| Default plan | `getDefaultPlanId`, `setDefaultPlanId` (free plans only) |

Plan/assignment changes emit webhook events via a lazy import (`emitWebhook`): `plan.created/updated/deleted` and the platform-scoped `subscription.assigned`. Feature-access checks are audit-logged (`feature.access.checked`); platform-plan assignment is logged as `subscription.platform_plan.assigned`.

---

## Files

| File | Purpose |
|---|---|
| `tenant_subscription.service.ts` | Core logic: plan CRUD, subscription lifecycle, feature gating |
| `tenant_subscription.feature-keys.ts` | Canonical feature key constants (`FEATURE_KEYS`) |
| `tenant_subscription.types.ts` | Zod schemas + TypeScript types |
| `tenant_subscription.dto.ts` | Zod DTOs for API input validation |
| `tenant_subscription.enums.ts` | Enums: `SubscriptionStatus`, `BillingInterval`, `PlanFeatureType` |
| `tenant_subscription.messages.ts` | Error/success message strings |
| `ui/subscription.plan-card.tsx` | Plan selection card |
| `ui/subscription.usage-meter.tsx` | Progress bar for LIMIT feature usage |
| `ui/subscription.upgrade-prompt.tsx` | Upgrade CTA shown when access is denied |
| `ui/subscription.feature-gate.tsx` | Wrapper that blocks UI based on feature access |
| `hooks/use-feature-access.ts` | Client-side hook: fetches feature access via axios |

---

## Feature Types

| Type | DB value | Meaning |
|---|---|---|
| `BOOLEAN` | `"true"` / `"false"` | Feature on/off switch |
| `LIMIT` | `"5"`, `"100"`, `"-1"` | Max count; `-1` = unlimited |

---

## Feature Keys

All keys are defined in `tenant_subscription.feature-keys.ts`. Always import from there — never hard-code strings.

```typescript
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';
```

| Constant | Key | Type |
|---|---|---|
| `FEATURE_KEYS.MAX_MEMBERS` | `max_members` | LIMIT |
| `FEATURE_KEYS.MAX_INVITATIONS` | `max_invitations` | LIMIT |
| `FEATURE_KEYS.STORAGE_GB` | `storage_gb` | LIMIT |
| `FEATURE_KEYS.MAX_DOMAINS` | `max_domains` | LIMIT |
| `FEATURE_KEYS.MAX_AI_REQUESTS` | `max_ai_requests` | LIMIT |
| `FEATURE_KEYS.CUSTOM_DOMAIN` | `custom_domain` | BOOLEAN |
| `FEATURE_KEYS.API_ACCESS` | `api_access` | BOOLEAN |
| `FEATURE_KEYS.SSO_LOGIN` | `sso_login` | BOOLEAN |
| `FEATURE_KEYS.AUDIT_LOGS` | `audit_logs` | BOOLEAN |
| `FEATURE_KEYS.AI_FEATURES` | `ai_features` | BOOLEAN |
| `FEATURE_KEYS.ADVANCED_ANALYTICS` | `advanced_analytics` | BOOLEAN |
| `FEATURE_KEYS.PRIORITY_SUPPORT` | `priority_support` | BOOLEAN |

`FEATURE_KEYS` also defines `API_RATE_LIMIT` (`api_rate_limit`, LIMIT) and a set of **billing-aware service-gating keys** consumed by the AI / Mail / SMS / Storage / Webhook / API-key / invoicing flows: `feature_ai_chat`, `feature_ai_monthly_tokens`, `feature_email_send`, `feature_email_monthly_quota`, `feature_sms_send`, `feature_sms_monthly_quota`, `feature_storage_upload`, `feature_storage_quota_bytes`, `feature_webhooks`, `feature_api_keys`, `feature_invoicing`. BOOLEAN `feature_*` keys gate the capability; LIMIT `*_quota` / `*_monthly_*` keys are checked against the matching Redis-backed `TenantUsage` counter.

To add a new feature key: add it to `FEATURE_KEYS` in `tenant_subscription.feature-keys.ts`, then create the matching `PlanFeature` row in the plan admin UI or seed script.

---

## Enforcing a Feature in an API Route

Use `assertFeatureAccess` — it throws with a user-facing message when denied.

### BOOLEAN feature (on/off)

```typescript
// app/tenant/[tenantId]/api/ai/route.ts
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';

await TenantSubscriptionService.assertFeatureAccess(tenantId, FEATURE_KEYS.AI_FEATURES);
```

### LIMIT feature (count-based)

Get the current count first, then assert. The service compares `currentCount < limit`.

```typescript
// app/tenant/[tenantId]/api/members/route.ts
const { total: currentMemberCount } = await TenantMemberService.getByTenantId({
  tenantId, page: 1, pageSize: 1, search: null, memberRole: null, memberStatus: 'ACTIVE',
});

await TenantSubscriptionService.assertFeatureAccess(
  tenantId,
  FEATURE_KEYS.MAX_MEMBERS,
  currentMemberCount,
);
```

### With grace period

Pass `gracePercent` to allow a soft overflow (e.g., 10% over limit before hard block):

```typescript
await TenantSubscriptionService.assertFeatureAccess(
  tenantId,
  FEATURE_KEYS.MAX_MEMBERS,
  currentMemberCount,
  { gracePercent: 10 },
);
```

### Non-throwing check (read result without throwing)

Use `checkFeatureAccess` when you need the result object (e.g., to show a UI meter):

```typescript
const result = await TenantSubscriptionService.checkFeatureAccess(
  tenantId,
  FEATURE_KEYS.MAX_MEMBERS,
  currentMemberCount,
);
// result.allowed, result.type, result.limit, result.current, result.inGrace
```

---

## Feature Check API Endpoint

```
GET /tenant/[tenantId]/api/subscription/features?key=max_members&count=5
```

Requires `tenant:read` scope. Returns `{ success: true, result: FeatureAccessResult }`.

`count` is optional — omit it when checking a BOOLEAN feature or when current usage is unknown.

---

## UI Components

### FeatureGate — block UI when access is denied

Pass a pre-fetched `FeatureAccessResult`. If `result.allowed` is false, shows `UpgradePrompt` by default.

```tsx
// Server component — fetch on the server, pass result as prop
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service';
import { FeatureGate } from '@/modules/tenant_subscription/ui/subscription.feature-gate';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';

const result = await TenantSubscriptionService.checkFeatureAccess(tenantId, FEATURE_KEYS.CUSTOM_DOMAIN);

<FeatureGate result={result} tenantId={tenantId}>
  <CustomDomainSettings />
</FeatureGate>
```

Custom fallback:

```tsx
<FeatureGate result={result} tenantId={tenantId} fallback={<p>Not available on your plan.</p>}>
  <AdvancedAnalytics />
</FeatureGate>
```

Silent mode (renders nothing when denied):

```tsx
<FeatureGate result={result} tenantId={tenantId} silent>
  <PremiumBadge />
</FeatureGate>
```

### PlanUsageMeter — show current / limit bar

Only for `LIMIT` features. Color: green < 80%, yellow 80–99%, red ≥ 100%.

```tsx
import { PlanUsageMeter } from '@/modules/tenant_subscription/ui/subscription.usage-meter';

// result must be FeatureAccessResult with type === 'LIMIT'
<PlanUsageMeter result={result} label="Team Members" />
```

### UpgradePrompt — standalone upgrade CTA

```tsx
import { UpgradePrompt } from '@/modules/tenant_subscription/ui/subscription.upgrade-prompt';

// Full card
<UpgradePrompt result={result} tenantId={tenantId} />

// Inline compact version
<UpgradePrompt result={result} tenantId={tenantId} compact />

// Custom text
<UpgradePrompt
  result={result}
  tenantId={tenantId}
  title="Storage limit reached"
  description="Upgrade to Pro for 100 GB of storage."
/>
```

### useFeatureAccess — client-side hook

Uses `axiosInstance` + `useState/useEffect`. No React Query.

```tsx
'use client';
import { useFeatureAccess } from '@/modules/tenant_subscription/hooks/use-feature-access';
import { PlanUsageMeter } from '@/modules/tenant_subscription/ui/subscription.usage-meter';
import { FEATURE_KEYS } from '@/modules/tenant_subscription/tenant_subscription.feature-keys';

function MembersSection({ tenantId, memberCount }: { tenantId: string; memberCount: number }) {
  const { result, loading } = useFeatureAccess(tenantId, FEATURE_KEYS.MAX_MEMBERS, memberCount);

  if (loading || !result || result.type !== 'LIMIT') return null;

  return <PlanUsageMeter result={result} label="Team Members" />;
}
```

---

## Self-service paid checkout

Two ways for a tenant admin to buy a plan from the subscription admin page
(`/tenant/<id>/admin/subscription`):

- **Hosted redirect** (Stripe, PayPal) — `purchaseSubscription` → provider checkout URL → return → `confirmPayment`.
- **In-app card form** (iyzico) — the card is collected on our own form
  (`modules_next/payment/ui/CreditCardForm.tsx`, shown via `CardCheckoutModal`).
  Charged synchronously (non-3DS) **or** via 3D Secure when required (see below).
- **iyzico wallet** (MasterPass / BKM Express) — `purchaseSubscription({ convertToTry: true })`
  → iyzico hosted page (wallets shown automatically) → redirect → `confirmPayment`. Charged in TRY.
- **Stripe Express Checkout** (Apple/Google Pay, Click to Pay, Link…) — `startExpressCheckout`
  → `<ExpressCheckoutElement>` (`StripeExpressCheckoutModal`) → `confirmExpressCheckout`
  (server verifies the PaymentIntent succeeded before activating).

Which wallets each provider can surface comes from
[`PaymentService.getWalletMatrix()`](../payment/README.md#wallets--alternative-payment-methods)
(`GET /tenant/[id]/api/payments/wallets`), shown as badges in the UI.

### Charge Turkish cards in TRY

When paying via a **TRY-settling provider** (currently **iyzico**) with a
**Turkish card**, a plan priced in USD is converted to TRY at the live
[TCMB rate](../../exchange_rate/README.md) and charged in TRY. "Turkish" =
BIN→country is `TR` **or** the provider's BIN lookup returned a (Turkish) bank
(see [`payment` · BIN check](../payment/README.md#direct-card-charging--bin-check)).

```typescript
// Live preview for the card form (no charge): amount/currency + detected brand/bank
await TenantSubscriptionService.quote(tenantId, planId, bin /* 6–8 digits */, 'IYZICO');
// → { baseAmount, baseCurrency, isTurkish, chargedAmount, chargedCurrency, exchangeRate, brand, bankName }

// Real charge. Returns a discriminated result:
await TenantSubscriptionService.payWithCard({
  tenantId, planId, card /* CreditCardInput */, provider: 'IYZICO',
  customerEmail, customerName, ip, callbackUrl /* enables 3DS */,
});
// → { status: 'completed', paymentId, subscription, chargedAmount, chargedCurrency, exchangeRate }
// → { status: 'requires_3ds', paymentId, htmlContent /* base64 bank form */, chargedAmount, ... }

// Finalize 3DS on the bank callback (idempotent activation)
await TenantSubscriptionService.complete3dsCardPayment({ tenantId, conversationId, providerPaymentId });
```

### 3D Secure (auto)

3DS is chosen **automatically**: a commercial card (`force3ds`) or a **Turkish
card** goes through 3DS; other cards are charged non-3DS in one step. (3DS only
engages when a `callbackUrl` is passed and the provider supports it.)

Flow: `payWithCard` → `requires_3ds` + `htmlContent` → the browser renders the
bank's self-submitting form (full-page redirect via `document.write`) → bank POSTs
to the **public** callback → it re-validates with iyzico and activates the
subscription → redirects back to `…/admin/subscription?paymentSuccess=true&paymentId=…`
(the existing idempotent confirm/refresh takes over).

The `Payment` row stores the **actually charged** amount/currency (TRY when
converted); the original price + rate live in `Payment.metadata`
(`originalAmount`, `originalCurrency`, `exchangeRate`, `chargedAmountTRY`,
`binCountry`, `binBank`) for audit/invoicing. The card PAN/CVV are passed straight
to the provider and never persisted or logged.

**Routes** (ADMIN unless noted):

| Route | Body | Returns |
|---|---|---|
| `POST /tenant/[id]/api/subscription/quote` | `{ planId, bin, provider? }` | live TRY quote + brand/bank |
| `POST /tenant/[id]/api/subscription/pay` | `{ planId, card, provider?, customerEmail?, customerName? }` | `completed` or `requires3ds`+`htmlContent` (402 on decline) |
| `POST /tenant/[id]/api/subscription/pay/3ds-callback` | iyzico form post (**public**) | 303 redirect back to the subscription page |
| `POST /tenant/[id]/api/subscription/payment-intent` | `{ planId, provider?, customerEmail?, customerName? }` | `{ paymentId, clientSecret, publishableKey, amount, currency }` (Express Checkout) |
| `POST /tenant/[id]/api/subscription/payment-intent/confirm` | `{ paymentId, provider? }` | `{ subscription }` (verifies PaymentIntent, 402 if not succeeded) |
| `POST /tenant/[id]/api/payments/bin-check` | `{ bin, provider? }` | combined `CardBinInfo` |
| `GET /tenant/[id]/api/payments/wallets` | — | provider → supported wallets matrix |

## Root-admin: assign a platform plan for free

Root (Platform) tenant admins can grant any other tenant a plan **without payment**
from the sysadmin tenant-detail page (`/tenant/<ROOT>/admin/tenants/<target>`).

```typescript
await TenantSubscriptionService.assignPlatformPlan(targetTenantId, {
  planId,            // a plan in the ROOT tenant's catalogue
  billingInterval,   // optional; defaults to the source plan's interval
  priceOverride,     // optional; omit = copy source price, 0 = free-forever
});
```

Because plans are tenant-scoped, this clones the source plan's
category → product → plan → features chain into the target tenant (idempotently,
keyed by `sku = platform-plan:<sourcePlanId>`) and then calls `assignPlan`, which
bypasses payment. Exposed via `GET`/`POST /tenant/[tenantId]/api/tenants/[targetTenantId]/subscription`
(guarded by `authenticateAdminRequest` — root-tenant ADMIN only). Each assignment
is recorded in the audit log as `subscription.platform_plan.assigned`.

## Default plan (auto-assigned on tenant creation)

A **free** ROOT-catalogue plan can be marked as the default. When set, every
newly created tenant is automatically granted that plan for free (via
`assignPlatformPlan` with `priceOverride: 0`) during `TenantService.seedDefaults`
— best-effort, so a failure never blocks tenant creation.

```typescript
await TenantSubscriptionService.getDefaultPlanId();          // string | null
await TenantSubscriptionService.setDefaultPlanId(planId);    // only a free plan (basePrice 0)
await TenantSubscriptionService.setDefaultPlanId(null);      // clear
```

Stored as the `defaultPlanId` system setting on the ROOT tenant (same place as
`subscriptionGracePeriodDays`). `setDefaultPlanId` rejects any plan whose wrapped
product has a non-zero base price, so tenants are never silently put on a paid
plan. Managed from the Plans admin list (row action **Set as default** /
**Remove as default**, shown only for free plans) via
`GET`/`PUT /tenant/[tenantId]/api/plans/default` (root-tenant ADMIN only).

## Caching

Feature access results are cached in Redis with a 5-minute TTL per tenant:

```
feature:sub:{tenantId}
```

The cache is invalidated automatically when:
- A subscription is assigned (`assignPlan`)
- A subscription is cancelled (`cancelSubscription`)

To manually invalidate (e.g., after plan feature edits):

```typescript
await TenantSubscriptionService.invalidateFeatureCache(tenantId);
```

---

## Settings

All subscription settings are **platform/root-scoped** — declared in `tenant_subscription.setting.keys.ts` (`SUBSCRIPTION_KEYS`) and stored on the ROOT tenant. There are no per-tenant overrides.

| Key | Read by service | Notes |
|---|---|---|
| `subscriptionGracePeriodDays` | yes (`getGracePeriodDays`) | Days a PAST_DUE tenant keeps access before EXPIRED. Read only at `ROOT_TENANT_ID`; default `7`. |
| `defaultPlanId` | yes (`getDefaultPlanId` / `setDefaultPlanId`) | Free ROOT-catalogue plan auto-cloned + assigned to every newly created tenant. Only a plan whose product has base price 0 may be set. |
| `subscriptionEnabled` | no | Platform-wide feature toggle, edited in the Platform settings tab; not read at runtime. |
| `trialEnabled` | no | Platform trial toggle; declared but not read by the service. |
| `defaultTrialDays` | no | Platform default trial length; the service derives trial from each plan's `trialDays` instead. |

---

## Tenant Variability

> What varies per tenant in this module — and what could. Audited 2026-06-03.

Manages per-tenant subscription plans, plan features, and feature-gating/billing for each tenant, but all of its declared *settings* are platform/root-scoped — the per-tenant variability lives entirely in tenant-scoped catalog/subscription data, not in tenant-overridable settings.

### Tenant-scoped data

| Entity | Table | Tenant-variable columns |
|---|---|---|
| `TenantSubscription` | `tenant_subscriptions` | planId, status, billingInterval, currentPeriodStart, currentPeriodEnd, trialEndsAt, cancelledAt, gracePeriodEndsAt |
| `SubscriptionPlan` | `subscription_plans` | productId, interval, trialDays, status |
| `PlanFeature` | `plan_features` | planId, key, label, type, value, sortOrder |

All rows isolated by `tenantId` via the per-tenant DataSource.

### Per-tenant behavior

- `tenant_subscription.service.ts:checkFeatureAccess` — Feature gating is fully per-tenant: reads the tenant's own TenantSubscription status/grace + that tenant's PlanFeature rows (BOOLEAN allow vs LIMIT count, unlimited=-1) from tenantDataSourceFor(tenantId), Redis-cached per tenantId. Each tenant's plan features decide what is allowed/limited.
- `tenant_subscription.service.ts:assignPlan` — Trial vs active state, period end, and billing interval are derived from the specific tenant's plan (plan.trialDays, plan.interval), so each tenant's subscription lifecycle differs by its assigned plan.
- `tenant_subscription.service.ts:assignPlatformPlan` — Per new/target tenant, clones the ROOT default/platform plan's category+product+plan+feature chain into that tenant's datasource and assigns it for free (priceOverride 0).
- `tenant_subscription.service.ts:resolveCharge` — Charge currency/amount vary per tenant: based on the tenant's own product.basePrice/currency and the payer card BIN (TRY conversion at live rate only for a TRY-settling provider + Turkish card).
- `tenant_subscription.service.ts:startGracePeriod` — Sets gracePeriodEndsAt on the specific tenant's subscription (length from the global subscriptionGracePeriodDays setting); expireOverdueSubscriptions then expires each overdue tenant individually.

### Candidates (global / hardcoded today → could be per-tenant)

| What | Where | Why per-tenant | Suggested key |
|---|---|---|---|
| Grace period length is global (read once at ROOT) yet applied per tenant, so a tenant/plan cannot have a longer or shorter grace window. | `tenant_subscription.service.ts:getGracePeriodDays` | getGracePeriodDays() calls SettingService.getValue(ROOT_TENANT_ID, 'subscriptionGracePeriodDays') — there is no per-tenant override, but dunning/grace policy is a plausible per-tenant or per-plan concern. | `subscriptionGracePeriodDays` |
| Default payment provider is hardcoded ('STRIPE' for hosted/express checkout, 'IYZICO' for card/quote) instead of resolved from a tenant's preferred provider. | `tenant_subscription.service.ts:purchaseSubscription / startExpressCheckout / payWithCard / quote` | Each tenant may enable different providers; the fallback provider should come from a per-tenant setting rather than a literal default. | `defaultPaymentProvider` |
| TRY-settling providers set is hardcoded to ['IYZICO'], so which providers trigger TRY conversion cannot vary per tenant/market. | `tenant_subscription.service.ts:TRY_SETTLE_PROVIDERS` | Tenants in other regions may use different local-settlement providers; the conversion rule is currently global infrastructure config. | `trySettleProviders` |
| Feature-access Redis cache TTL is a hardcoded 300s constant. | `tenant_subscription.service.ts:FEATURE_CACHE_TTL` | Mostly intentional shared-infra tuning, but staleness tolerance of feature gates could reasonably be platform-configurable; not strictly per-tenant. | `featureCacheTtlSeconds` |
| Subscription-expire cron pattern defaults to '0 * * * *' in code. | `tenant_subscription.job.ts:scheduleSubscriptionExpireJob` | This is a single shared platform worker, so global is appropriate; flagged only as configurable platform tuning, not per-tenant. | — |

### Platform/root-only settings (not per-tenant)

Configured once at the root tenant; identical for all tenants:

- `subscriptionGracePeriodDays` — Days a PAST_DUE tenant keeps access before EXPIRED. Read only at ROOT_TENANT_ID in getGracePeriodDays(); applies to every tenant (default 7).
- `defaultPlanId` — ROOT-catalogue free plan auto-cloned+assigned to every newly created tenant. Read/written only at ROOT in getDefaultPlanId()/setDefaultPlanId().
- `subscriptionEnabled` — Platform-wide toggle for the subscription feature. Edited only in the Platform settings tab; not read by the service at runtime.
- `trialEnabled` — Platform-wide trial toggle. Declared in keys but not read by the service.
- `defaultTrialDays` — Platform default trial length. Edited in the Platform settings tab; service derives trial from each plan's trialDays instead, so this key is not read at runtime.

---

## Dependencies

- `modules/db` — per-tenant DataSource resolution (`tenantDataSourceFor`, `getDataSource`).
- `modules/payment` — `SubscriptionPlan` / `PlanFeature` entities, `PaymentService` (checkout, card charging, BIN check, 3DS, payment intents).
- `modules/store` — `StoreProduct` / `StoreCategory` entities backing each plan.
- `modules/exchange_rate` — live TCMB rate for TRY conversion.
- `modules/redis` — feature-access cache + BullMQ connection for the expire worker.
- `modules/setting` — ROOT-tenant setting reads/writes (`subscriptionGracePeriodDays`, `defaultPlanId`).
- `modules/audit_log` — feature-access and platform-plan-assignment audit entries.
- `modules/webhook` — emits `plan.*` and `subscription.assigned` events (lazy import to avoid an init cycle).
- `modules/tenant` — `ROOT_TENANT_ID` / `isRootTenant`.
