import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { CreateFeatureRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'

/**
 * GET /tenant/[tenantId]/api/plans/[planId]/features
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; planId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

        const { tenantId, planId } = await params


    try {


      await TenantSessionNextService.authenticateTenantByRequest({


        request, tenantId, requiredTenantRole: 'ADMIN',


      });


    } catch (err: any) {


      return NextResponse.json({ success: false, message: err.message }, { status: 403 });


    }

    const features = await TenantSubscriptionService.getFeaturesByPlan(tenantId, planId)
    return NextResponse.json({ success: true, features })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /tenant/[tenantId]/api/plans/[planId]/features
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; planId: string }> }
) {
  try {
        const { tenantId, planId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    const body = await request.json()
    const parsed = CreateFeatureRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const feature = await TenantSubscriptionService.addFeature(tenantId, planId, parsed.data)
    return NextResponse.json({ success: true, feature }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED },
      { status: 500 }
    )
  }
}
