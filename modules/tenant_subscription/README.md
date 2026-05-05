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
