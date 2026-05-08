import { NextResponse } from 'next/server';
import { tenantDataSourceFor } from '@/libs/typeorm';
import { TenantSubscription } from '@/modules/tenant_subscription/entities/tenant_subscription.entity';

const GRACE_OK_STATUSES = new Set(['ACTIVE', 'TRIALING', 'FREE']);

/**
 * Returns null if the tenant's subscription is in good standing.
 * Returns a 402 NextResponse if the subscription has expired past its grace period.
 *
 * Usage in API routes (call AFTER authenticateTenantByRequest):
 *   const gp = await checkGracePeriod(tenantId);
 *   if (gp) return gp;
 */
export async function checkGracePeriod(tenantId: string): Promise<NextResponse | null> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSubscription);
    const subscription = await repo.findOne({ where: { tenantId } });

    if (!subscription) return null; // no subscription — allow (subscription middleware handles this separately)

    if (GRACE_OK_STATUSES.has(subscription.status)) return null;

    // PAST_DUE / CANCELLED — check grace period
    if (subscription.gracePeriodEndsAt) {
      const now = new Date();
      if (subscription.gracePeriodEndsAt > now) {
        // Still within grace — allow but caller can add warning header
        return null;
      }
    }

    // Grace expired or no grace — enforce 402
    return NextResponse.json(
      {
        code: 'GRACE_PERIOD_EXPIRED',
        message: 'Your subscription payment is overdue. Please update your payment method to continue.',
      },
      {
        status: 402,
        headers: {
          'X-Subscription-Status': subscription.status,
        },
      },
    );
  } catch {
    // Never block a request due to a grace period check failure
    return null;
  }
}

/**
 * Returns true if the tenant is still within an active grace period
 * (past_due but not yet expired). Useful for showing warning banners.
 */
export async function isInGracePeriod(tenantId: string): Promise<boolean> {
  try {
    const ds = await tenantDataSourceFor(tenantId);
    const repo = ds.getRepository(TenantSubscription);
    const sub = await repo.findOne({ where: { tenantId } });
    if (!sub) return false;
    if (GRACE_OK_STATUSES.has(sub.status)) return false;
    if (!sub.gracePeriodEndsAt) return false;
    return sub.gracePeriodEndsAt > new Date();
  } catch {
    return false;
  }
}
