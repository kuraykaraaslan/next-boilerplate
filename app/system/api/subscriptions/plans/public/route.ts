import { NextRequest, NextResponse } from 'next/server'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'

/**
 * GET /system/api/subscriptions/plans/public
 * List all active subscription plans with features (no admin auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const plans = await TenantSubscriptionService.getPlansWithFeatures('ACTIVE')
    return NextResponse.json({ success: true, plans })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}
