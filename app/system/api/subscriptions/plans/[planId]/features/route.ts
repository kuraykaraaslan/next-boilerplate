import { NextRequest, NextResponse } from 'next/server'
import UserSessionNextService from '@/modules/user_session/user_session.service.next'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { CreateFeatureRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'

/**
 * GET /system/api/subscriptions/plans/[planId]/features
 * List features for a plan (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' })
    const { planId } = await params

    const features = await TenantSubscriptionService.getFeaturesByPlan(planId)
    return NextResponse.json({ success: true, features })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /system/api/subscriptions/plans/[planId]/features
 * Add a feature to a plan (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: 'ADMIN' })
    const { planId } = await params

    const body = await request.json()
    const parsed = CreateFeatureRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const feature = await TenantSubscriptionService.addFeature(planId, parsed.data)
    return NextResponse.json({ success: true, feature }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FEATURE_CREATE_FAILED },
      { status: 500 }
    )
  }
}
