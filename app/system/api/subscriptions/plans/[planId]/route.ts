import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from 'next/server'
import UserSessionNextService from '@/modules/user_session/user_session.service.next'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { UpdatePlanRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'

/**
 * GET /system/api/subscriptions/plans/[planId]
 * Get a single plan with features (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] })
    const { planId } = await params

    const plan = await TenantSubscriptionService.getPlanWithFeatures(planId)
    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_NOT_FOUND },
      { status: 500 }
    )
  }
}

/**
 * PUT /system/api/subscriptions/plans/[planId]
 * Update a subscription plan (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] })
    const { planId } = await params

    const body = await request.json()
    const parsed = UpdatePlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const plan = await TenantSubscriptionService.updatePlan(planId, parsed.data)
    return NextResponse.json({ success: true, plan })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_UPDATE_FAILED },
      { status: 500 }
    )
  }
}

/**
 * DELETE /system/api/subscriptions/plans/[planId]
 * Delete a subscription plan (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] })
    const { planId } = await params

    await TenantSubscriptionService.deletePlan(planId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_DELETE_FAILED },
      { status: 500 }
    )
  }
}
