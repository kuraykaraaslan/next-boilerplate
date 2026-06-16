import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantPlanService from '@nb/tenant_subscription/server/tenant_subscription.plan.service'
import { UpdateFeatureRequestSchema } from '@nb/tenant_subscription/server/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@nb/tenant_subscription/server/tenant_subscription.messages'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'

/**
 * PUT /tenant/[tenantId]/api/plans/[planId]/features/[featureId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; planId: string; featureId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

        const { tenantId, featureId } = await params


    try {


      await TenantSessionNextService.authenticateTenantByRequest({


        request, tenantId, requiredTenantRole: 'ADMIN',


      });


    } catch (err: any) {


      return NextResponse.json({ success: false, message: err.message }, { status: 403 });


    }

    const body = await request.json()
    const parsed = UpdateFeatureRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const feature = await TenantPlanService.updateFeature(tenantId, featureId, parsed.data)
    return NextResponse.json({ success: true, feature })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FEATURE_UPDATE_FAILED },
      { status: 500 }
    )
  }
}

/**
 * DELETE /tenant/[tenantId]/api/plans/[planId]/features/[featureId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; planId: string; featureId: string }> }
) {
  try {
        const { tenantId, featureId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    await TenantPlanService.removeFeature(tenantId, featureId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FEATURE_DELETE_FAILED },
      { status: 500 }
    )
  }
}
