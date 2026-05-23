import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { UpdatePlanRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'

/**
 * GET /tenant/[tenantId]/api/plans/[planId]
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

    const plan = await TenantSubscriptionService.getPlanWithFeatures(tenantId, planId)
    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND },
      { status: 500 }
    )
  }
}

/**
 * PUT /tenant/[tenantId]/api/plans/[planId]
 */
export async function PUT(
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
    const parsed = UpdatePlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const plan = await TenantSubscriptionService.updatePlan(tenantId, planId, parsed.data)
    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED },
      { status: 500 }
    )
  }
}

/**
 * DELETE /tenant/[tenantId]/api/plans/[planId]
 */
export async function DELETE(
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

    await TenantSubscriptionService.deletePlan(tenantId, planId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED },
      { status: 500 }
    )
  }
}
