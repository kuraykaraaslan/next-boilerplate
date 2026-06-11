# Feature Spec: Root-admin can assign plans to other tenants for free

> Self-contained implementation spec. Hand this to another AI/engineer to
> reproduce the exact feature in this codebase (or adapt it elsewhere).
> Stack: **Next.js (App Router) + TypeORM + Zod + Redis**, multi-tenant SaaS boilerplate.

---

## 1. Goal

Allow the **root (Platform) tenant** admin to change *any other tenant's* subscription
plan **for free** (no payment / no checkout), from the sysadmin tenant-detail page.
The admin may also set a custom price (or leave it free).

Today plan changes only happen via the tenant's own ADMIN going through a payment
provider checkout (`POST /tenant/[tenantId]/api/subscription` → Stripe/PayPal/Iyzico).
There is no manual/free assignment path for the platform operator.

---

## 2. Critical domain constraints (read before coding)

These shape the whole design — do not skip.

### 2.1 Plans are **tenant-scoped**
`SubscriptionPlan`, `StoreProduct`, `PlanFeature` and `TenantSubscription` all carry a
`tenantId` column, and **every** query filters by it. `tenantDataSourceFor(tenantId)`
and `getDataSource()` resolve to a single shared DB; isolation is purely the `tenantId`
column.

Consequences:
- `assignPlan(tenantId, { planId })` looks up the plan with `where { tenantId, planId }`.
  A plan owned by the ROOT tenant (`tenantId = ROOT`) will **not** match for another tenant.
- `getSubscription(tenantId)` resolves the product via `fetchProductOrThrow(tenantId, plan.productId)`.
- `checkFeatureAccess(tenantId, key)` reads `PlanFeature where { tenantId }`.

➡️ **To apply a ROOT/platform plan to another tenant you must CLONE the plan chain
(category → product → plan → features) under the target tenant's `tenantId`, then assign.**
`SubscriptionPlan.productId` is a required FK, and `StoreProduct.categoryId` is required
and non-null — so the product *and* a category must be cloned too.

### 2.2 "Free" comes from bypassing payment
`assignPlan` (the method that runs *after* a successful checkout) writes the
`TenantSubscription` row directly and creates **no `Payment` record**. So any direct call
to it is inherently free. Price lives only on the cloned `StoreProduct.basePrice` and is
only relevant if the tenant later renews via *their own* self-service checkout.
- Omit `priceOverride` → copy the source plan's price.
- `priceOverride = 0` → free-forever.
- `priceOverride = 49` → tenant would be billed 49 on a future self-service renewal.

### 2.3 Root tenant identity
`modules/tenant/tenant.constants.ts`:
```ts
export const ROOT_TENANT_ID = '00000000-0000-4000-8000-000000000000';
export function isRootTenant(tenantId): boolean { return tenantId === ROOT_TENANT_ID; }
```
Root-admin API auth helper: `authenticateAdminRequest(request)` in
`modules_next/auth/auth.admin-guard.next.ts` — authenticates the caller as a
**root-tenant ADMIN member** and returns `{ ok: true, user, ... } | { ok: false, response }`.
`auth.user.userId` is the acting admin.

### 2.4 Relevant entity fields
- `StoreCategory`: `categoryId, tenantId, name, slug, description?, isActive`
- `StoreProduct`: `productId, tenantId, categoryId, name, slug, shortDescription?, basePrice(number), currency, sku?, status('DRAFT' default), isDigital, trackInventory`
- `SubscriptionPlan`: `planId, tenantId, productId, interval, trialDays, status`
- `PlanFeature`: `featureId, tenantId, planId, key, label, type, value, sortOrder` (unique: `tenantId+planId+key`)
- `TenantSubscription`: `subscriptionId, tenantId, planId, status, billingInterval, currentPeriodStart/End, trialEndsAt?, cancelledAt?` (unique: `tenantId` — one sub per tenant)

### 2.5 Reused existing methods (do NOT rewrite)
`TenantSubscriptionService`: `getPlanWithFeatures`, `getPlansWithFeatures`, `getSubscription`,
`assignPlan` (already invalidates the Redis feature cache).

---

## 3. Changes — exact diffs

### 3.1 DTO — `modules/tenant_subscription/tenant_subscription.dto.ts`
Add after `AssignSubscriptionRequestSchema`:
```ts
/**
 * Root-admin only: clone a root/platform plan onto another tenant and assign it
 * for free (no payment). `planId` is a plan in the ROOT tenant's catalogue.
 */
export const AssignPlatformPlanRequestSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  /** Optional override; defaults to the source plan's interval. */
  billingInterval: BillingIntervalEnum.optional(),
  /**
   * Optional price for the cloned product the target tenant would see on a
   * future self-service renewal. Omit to copy the source price; 0 = free.
   */
  priceOverride: z.coerce.number().nonnegative().optional(),
})
```
Add to type exports:
```ts
export type AssignPlatformPlanDTO = z.infer<typeof AssignPlatformPlanRequestSchema>
```

### 3.2 Messages — `modules/tenant_subscription/tenant_subscription.messages.ts`
Add under the Subscription section:
```ts
PLATFORM_PLAN_ASSIGN_FAILED: 'Failed to assign platform plan to tenant',
PLATFORM_PLAN_ONLY_ROOT: 'Only root-tenant plans can be assigned to other tenants',
```

### 3.3 Service — `modules/tenant_subscription/tenant_subscription.service.ts`

Imports:
```ts
import { StoreCategory as CategoryEntity } from '@/modules/store/entities/store_category.entity';
import { ROOT_TENANT_ID, isRootTenant } from '@/modules/tenant/tenant.constants';
// and add AssignPlatformPlanDTO to the existing `./tenant_subscription.dto` type import
```

New method (place right after `assignPlan`, before `getSubscription`):
```ts
/**
 * Root-admin only: take a plan from the ROOT (Platform) catalogue, clone its
 * category/product/plan/feature chain into the target tenant, and assign it
 * for free (no payment). Idempotent — re-assigning the same source plan reuses
 * the cloned rows (updating price + features) instead of duplicating them.
 *
 * The assignment is always free because {@link assignPlan} bypasses payment;
 * `priceOverride` only sets the cloned product's `basePrice` (what the tenant
 * would pay on a future self-service renewal). Omit to copy the source price,
 * pass `0` for a free-forever plan.
 */
static async assignPlatformPlan(targetTenantId: string, data: AssignPlatformPlanDTO): Promise<TenantSubscription> {
  if (isRootTenant(targetTenantId)) {
    throw new Error('Cannot assign a platform plan to the root tenant itself');
  }

  try {
    // 1. Load the source plan (+ product + features) from the ROOT catalogue.
    const source = await this.getPlanWithFeatures(ROOT_TENANT_ID, data.planId);

    const ds = await tenantDataSourceFor(targetTenantId);

    // 2a. find-or-create a "Platform Plans" category in the target tenant.
    const catRepo = ds.getRepository(CategoryEntity);
    let category = await catRepo.findOne({ where: { tenantId: targetTenantId, slug: 'platform-plans' } });
    if (!category) {
      category = await catRepo.save(catRepo.create({
        tenantId: targetTenantId,
        name: 'Platform Plans',
        slug: 'platform-plans',
        description: 'Plans assigned by the platform administrator.',
        isActive: true,
      }));
    }

    // 2b. find-or-create the cloned product (keyed by source plan id via sku).
    const sku = `platform-plan:${source.planId}`;
    const basePrice = data.priceOverride ?? source.product.basePrice;
    const prodRepo = ds.getRepository(ProductEntity);
    let product = await prodRepo.findOne({ where: { tenantId: targetTenantId, sku } });
    if (product) {
      await prodRepo.update({ tenantId: targetTenantId, productId: product.productId }, {
        name: source.product.name,
        basePrice,
        currency: source.product.currency,
        status: 'ACTIVE',
      } as any);
      product = (await prodRepo.findOne({ where: { tenantId: targetTenantId, productId: product.productId } }))!;
    } else {
      product = await prodRepo.save(prodRepo.create({
        tenantId: targetTenantId,
        categoryId: category.categoryId,
        name: source.product.name,
        slug: `platform-${source.product.slug}`,
        shortDescription: source.product.shortDescription ?? undefined,
        basePrice,
        currency: source.product.currency,
        sku,
        status: 'ACTIVE',
        isDigital: true,
        trackInventory: false,
      }));
    }

    // 2c. find-or-create the cloned plan bound to that product.
    const planRepo = ds.getRepository(SubscriptionPlanEntity);
    let plan = await planRepo.findOne({ where: { tenantId: targetTenantId, productId: product.productId } });
    if (plan) {
      await planRepo.update({ tenantId: targetTenantId, planId: plan.planId }, {
        interval: source.interval,
        trialDays: source.trialDays,
        status: 'ACTIVE',
      } as any);
      plan = (await planRepo.findOne({ where: { tenantId: targetTenantId, planId: plan.planId } }))!;
    } else {
      plan = await planRepo.save(planRepo.create({
        tenantId: targetTenantId,
        productId: product.productId,
        interval: source.interval,
        trialDays: source.trialDays,
        status: 'ACTIVE',
      }));
    }

    // 2d. mirror the source plan's features (replace any existing).
    const featRepo = ds.getRepository(PlanFeatureEntity);
    await featRepo.delete({ tenantId: targetTenantId, planId: plan.planId });
    if (source.features.length > 0) {
      await featRepo.save(source.features.map((f) => featRepo.create({
        tenantId: targetTenantId,
        planId: plan!.planId,
        key: f.key,
        label: f.label,
        type: f.type,
        value: f.value,
        sortOrder: f.sortOrder,
      })));
    }

    // 3. assign the cloned plan — payment is bypassed, so this is free.
    return await this.assignPlan(targetTenantId, {
      planId: plan.planId,
      billingInterval: data.billingInterval,
    });
  } catch (error) {
    Logger.error(`${SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    throw error instanceof Error ? error : new Error(SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED);
  }
}
```

> Idempotency keys: product `sku = platform-plan:<sourcePlanId>`, category `slug = platform-plans`,
> plan found by `(tenantId, productId)`. Re-running updates price+features, never duplicates.

### 3.4 API route — NEW FILE
`app/tenant/[tenantId]/api/tenants/[targetTenantId]/subscription/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import TenantSubscriptionService from "@/modules/tenant_subscription/tenant_subscription.service";
import { AssignPlatformPlanRequestSchema } from "@/modules/tenant_subscription/tenant_subscription.dto";
import { SUBSCRIPTION_MESSAGES } from "@/modules/tenant_subscription/tenant_subscription.messages";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { authenticateAdminRequest } from "@/modules_next/auth/auth.admin-guard.next";
import { ROOT_TENANT_ID } from "@/modules/tenant/tenant.constants";
import AuditLogService from "@/modules/audit_log/audit_log.service";

/**
 * GET /tenant/[tenantId]/api/tenants/[targetTenantId]/subscription
 * Root-tenant admin: get a tenant's current subscription plus the platform
 * plans that can be assigned to it for free.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const [subscription, platformPlans] = await Promise.all([
      TenantSubscriptionService.getSubscription(targetTenantId),
      TenantSubscriptionService.getPlansWithFeatures(ROOT_TENANT_ID, "ACTIVE"),
    ]);

    return NextResponse.json({ subscription, platformPlans }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    );
  }
}

/**
 * POST /tenant/[tenantId]/api/tenants/[targetTenantId]/subscription
 * Root-tenant admin: assign a platform plan to the target tenant for free.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const body = await request.json();
    const parsed = AssignPlatformPlanRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const subscription = await TenantSubscriptionService.assignPlatformPlan(
      targetTenantId,
      parsed.data
    );

    // Record who granted which plan, to whom, and at what price.
    AuditLogService.log({
      tenantId: targetTenantId,
      actorId: auth.user.userId,
      actorType: "USER",
      action: "subscription.platform_plan.assigned",
      resourceType: "TenantSubscription",
      resourceId: subscription.subscriptionId,
      metadata: {
        sourcePlanId: parsed.data.planId,
        billingInterval: parsed.data.billingInterval ?? null,
        priceOverride: parsed.data.priceOverride ?? null,
        free: true,
      },
    }).catch(() => { /* audit failure must not block the assignment */ });

    return NextResponse.json(
      { subscription, message: "Plan assigned successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || SUBSCRIPTION_MESSAGES.PLATFORM_PLAN_ASSIGN_FAILED },
      { status: 500 }
    );
  }
}
```

### 3.5 UI — `app/tenant/[tenantId]/admin/(sysadmin-scope)/tenants/[targetTenantId]/page.tsx`
Client component, already guarded by `if (!isRootTenant(tenantId)) notFound();`.
`faCreditCard` is already imported. Reuses `Card`, `Button`, `Modal`, `Badge`,
`AlertBanner`, `Input`, `selectClass`, and the existing `api` axios instance.

**(a) Types** (add near the `Tenant` type):
```ts
type PlatformPlan = {
  planId: string;
  interval: string;
  product: { name: string; basePrice: number; currency: string };
};

type Subscription = {
  status: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  plan?: { product?: { name?: string | null } | null } | null;
} | null;
```

**(b) State** (with the other `useState`s):
```ts
const [subscription, setSubscription] = useState<Subscription>(null);
const [platformPlans, setPlatformPlans] = useState<PlatformPlan[]>([]);
const [showPlan, setShowPlan] = useState(false);
const [planValues, setPlanValues] = useState({ planId: '', billingInterval: '', priceOverride: '' });
const [assigningPlan, setAssigningPlan] = useState(false);
const [planError, setPlanError] = useState('');
```

**(c) Fetch** (after the members effect):
```ts
const fetchSubscription = useCallback(async () => {
  try {
    const res = await api.get(`/tenant/${tenantId}/api/tenants/${targetTenantId}/subscription`);
    setSubscription(res.data.subscription ?? null);
    setPlatformPlans(res.data.platformPlans ?? []);
  } catch {
    // silent — subscription panel is secondary
  }
}, [tenantId, targetTenantId]);

useEffect(() => { fetchSubscription(); }, [fetchSubscription]);
```

**(d) Handlers** (before the `if (loading)` early return):
```ts
function openPlan() {
  setPlanValues({ planId: platformPlans[0]?.planId ?? '', billingInterval: '', priceOverride: '' });
  setPlanError('');
  setShowPlan(true);
}

async function handleAssignPlan(e: React.FormEvent) {
  e.preventDefault();
  if (!planValues.planId) { setPlanError('Select a plan.'); return; }
  setAssigningPlan(true);
  setPlanError('');
  try {
    await api.post(`/tenant/${tenantId}/api/tenants/${targetTenantId}/subscription`, {
      planId: planValues.planId,
      ...(planValues.billingInterval ? { billingInterval: planValues.billingInterval } : {}),
      ...(planValues.priceOverride !== '' ? { priceOverride: Number(planValues.priceOverride) } : {}),
    });
    setShowPlan(false);
    fetchSubscription();
  } catch (err: any) {
    setPlanError(err.response?.data?.message ?? err.message ?? 'Failed to assign plan.');
  } finally {
    setAssigningPlan(false);
  }
}
```

**(e) Sidebar card** (before the "Status Management" `Card`):
```tsx
<Card title="Subscription Plan">
  <div className="space-y-3">
    <dl className="text-sm space-y-1">
      <div className="flex items-center justify-between">
        <dt className="text-text-secondary">Current plan</dt>
        <dd className="text-text-primary font-medium">{subscription?.plan?.product?.name ?? '—'}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-text-secondary">Status</dt>
        <dd>
          {subscription
            ? <Badge variant={subscription.status === 'ACTIVE' || subscription.status === 'TRIALING' ? 'success' : 'warning'} dot>{subscription.status}</Badge>
            : <Badge variant="neutral">No subscription</Badge>}
        </dd>
      </div>
    </dl>
    <Button variant="outline" fullWidth iconLeft={<FontAwesomeIcon icon={faCreditCard} />} onClick={openPlan}>
      Change Plan (Free)
    </Button>
  </div>
</Card>
```

**(f) Modal** (next to the other modals):
```tsx
<Modal
  open={showPlan}
  onClose={() => setShowPlan(false)}
  title="Change Plan (Free)"
  description="Assign a platform plan to this tenant with no payment."
  footer={
    <>
      <Button variant="ghost" onClick={() => setShowPlan(false)} disabled={assigningPlan}>Cancel</Button>
      <Button form="assign-plan-form" type="submit" loading={assigningPlan} disabled={platformPlans.length === 0}>Assign</Button>
    </>
  }
>
  <form id="assign-plan-form" onSubmit={handleAssignPlan} className="space-y-4">
    {planError && <AlertBanner variant="error" message={planError} />}
    {platformPlans.length === 0 && (
      <AlertBanner variant="warning" message="No active platform plans found. Create one in the Platform tenant's Plans page first." />
    )}
    <div className="flex flex-col gap-1">
      <label htmlFor="plan-id" className="text-xs font-medium text-text-secondary">Platform Plan</label>
      <select id="plan-id" value={planValues.planId}
        onChange={(e) => setPlanValues((v) => ({ ...v, planId: e.target.value }))} className={selectClass}>
        {platformPlans.map((p) => (
          <option key={p.planId} value={p.planId}>
            {p.product.name} — {p.product.basePrice} {p.product.currency} / {p.interval}
          </option>
        ))}
      </select>
    </div>
    <div className="flex flex-col gap-1">
      <label htmlFor="plan-interval" className="text-xs font-medium text-text-secondary">Billing Interval (optional)</label>
      <select id="plan-interval" value={planValues.billingInterval}
        onChange={(e) => setPlanValues((v) => ({ ...v, billingInterval: e.target.value }))} className={selectClass}>
        <option value="">Use plan default</option>
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
        <option value="MONTHLY">Monthly</option>
        <option value="QUARTERLY">Quarterly</option>
        <option value="YEARLY">Yearly</option>
      </select>
    </div>
    <Input id="plan-price" label="Custom price (optional)" type="number" min={0}
      placeholder="Empty = free / copy plan price" value={planValues.priceOverride}
      onChange={(e) => setPlanValues((v) => ({ ...v, priceOverride: e.target.value }))} />
  </form>
</Modal>
```

### 3.6 README — `modules/tenant_subscription/README.md`
Add a "Root-admin: assign a platform plan for free" section documenting
`assignPlatformPlan`, the clone behavior, the route, and the audit action.

---

## 4. Files touched (checklist)

| # | File | Change |
|---|------|--------|
| 1 | `modules/tenant_subscription/tenant_subscription.dto.ts` | `AssignPlatformPlanRequestSchema` + `AssignPlatformPlanDTO` |
| 2 | `modules/tenant_subscription/tenant_subscription.messages.ts` | 2 message constants |
| 3 | `modules/tenant_subscription/tenant_subscription.service.ts` | imports + `assignPlatformPlan()` |
| 4 | `app/tenant/[tenantId]/api/tenants/[targetTenantId]/subscription/route.ts` | **new** GET/POST route |
| 5 | `app/tenant/[tenantId]/admin/(sysadmin-scope)/tenants/[targetTenantId]/page.tsx` | card + modal + state/handlers |
| 6 | `modules/tenant_subscription/README.md` | docs |

---

## 5. Verification

1. Ensure ROOT tenant has ≥1 **ACTIVE platform plan** (category+product+plan+features); create a 2nd tenant.
2. Root admin → `/tenant/<ROOT>/admin/tenants/<target>` → **Change Plan (Free)** → pick a plan,
   leave custom price **empty** → Assign. Target tenant's `/admin/subscription` shows **ACTIVE**,
   and **no `Payment` row** is created.
3. Re-assign with a custom price (0 or 49) → cloned product's `basePrice` updates; **no duplicate**
   plan/product rows (idempotent via `sku`).
4. On the target tenant, exercise a feature-gated action (e.g. `max_members`) → features resolve correctly.
5. Hit the API as a **non-root** tenant → `authenticateAdminRequest` returns 401/403.
6. `audit_log` has a `subscription.platform_plan.assigned` row.
7. `npx tsc --noEmit` → 0 errors.

---

## 6. Adaptation notes (to apply this pattern elsewhere)

- **The pattern = "operate on another tenant from the root scope"**: guard with
  `authenticateAdminRequest` (root ADMIN), take `targetTenantId` from the route, call a
  service method scoped to that target.
- **If the target resource is tenant-scoped and you're sourcing from ROOT**, you must
  **clone** the dependency chain into the target tenant with deterministic idempotency keys
  (here: product `sku`, category `slug`). Mirror child rows by delete-then-recreate.
- **"Free / no-charge" = call the post-payment write path directly** (here `assignPlan`),
  never the checkout-initiation path.
- Always **audit-log** the privileged cross-tenant action with the acting `userId`.
- Invalidate any per-tenant cache the underlying write already handles (here `assignPlan`
  invalidates the Redis feature cache for you).
