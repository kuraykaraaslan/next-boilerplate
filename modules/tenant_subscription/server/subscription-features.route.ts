import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import TenantFeatureGateService from '@nb/tenant_subscription/server/tenant_subscription.feature.service'
import { SUBSCRIPTION_MESSAGES } from '@nb/tenant_subscription/server/tenant_subscription.messages'

/**
 * GET /tenant/[tenantId]/api/subscription/features?key=max_members&count=5
 * Check feature access for the current tenant.
 * - key: required — the feature key to check
 * - count: optional — current usage count (for LIMIT features)
 * Returns FeatureAccessResult.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    })

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const countParam = searchParams.get('count')

    if (!key) {
      return NextResponse.json(
        { success: false, message: 'Missing required query param: key' },
        { status: 400 },
      )
    }

    const count = countParam !== null ? parseInt(countParam, 10) : undefined

    const result = await TenantFeatureGateService.checkFeatureAccess(tenantId, key, count)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FEATURE_CHECK_FAILED },
      { status: 500 },
    )
  }
}
