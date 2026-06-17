import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantPlanService from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.plan.service'
import { SUBSCRIPTION_MESSAGES } from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.messages'
import { PUBLIC_CACHE } from '@kuraykaraaslan/common/server/utils/cacheHeaders'

/**
 * GET /tenant/[tenantId]/api/plans/public
 * List all active subscription plans with features (no auth required).
 * Surfaced under the root-tenant platform path for parity with the system
 * endpoint; the data itself is public.
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const plans = await TenantPlanService.getPlansWithFeatures('ACTIVE')
    return NextResponse.json({ success: true, plans }, { headers: PUBLIC_CACHE.long })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}
