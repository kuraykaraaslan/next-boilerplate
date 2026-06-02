# tenant_subscription module

Manages subscription plans, plan features, and feature enforcement for tenants.

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
