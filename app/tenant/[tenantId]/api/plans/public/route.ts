import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantPlanService from '@/modules/tenant_subscription/tenant_subscription.plan.service'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'
import { PUBLIC_CACHE } from '@/modules_next/common/utils/cacheHeaders'

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
