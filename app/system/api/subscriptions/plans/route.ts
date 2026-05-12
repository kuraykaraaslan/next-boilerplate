import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from 'next/server'
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { CreatePlanRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'

/**
 * GET /system/api/subscriptions/plans
 * List all subscription plans (admin only)
 */
export async function GET(request: NextRequest) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const includeFeatures = searchParams.get('includeFeatures') === 'true'

    const plans = includeFeatures
      ? await TenantSubscriptionService.getPlansWithFeatures(status || undefined)
      : await TenantSubscriptionService.getPlans(status || undefined)

    return NextResponse.json({ success: true, plans })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /system/api/subscriptions/plans
 * Create a new subscription plan (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" })

    const body = await request.json()
    const parsed = CreatePlanRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const plan = await TenantSubscriptionService.createPlan(parsed.data)
    return NextResponse.json({ success: true, plan }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PLAN_CREATE_FAILED },
      { status: 500 }
    )
  }
}
