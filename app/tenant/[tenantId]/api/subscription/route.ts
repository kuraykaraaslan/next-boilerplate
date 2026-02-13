import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { AssignSubscriptionRequestSchema } from '@/modules/tenant_subscription/tenant_subscription.dto'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'

/**
 * GET /tenant/[tenantId]/api/subscription
 * Get current tenant subscription
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    })

    const subscription = await TenantSubscriptionService.getSubscription(tenantId)
    return NextResponse.json({ success: true, subscription })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /tenant/[tenantId]/api/subscription
 * Subscribe to a plan or change subscription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    })

    const body = await request.json()
    const parsed = AssignSubscriptionRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const subscription = await TenantSubscriptionService.assignPlan(tenantId, parsed.data)
    return NextResponse.json({ success: true, subscription })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.SUBSCRIPTION_ASSIGN_FAILED },
      { status: 500 }
    )
  }
}

/**
 * DELETE /tenant/[tenantId]/api/subscription
 * Cancel tenant subscription
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    })

    const subscription = await TenantSubscriptionService.cancelSubscription(tenantId)
    return NextResponse.json({ success: true, subscription })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.SUBSCRIPTION_CANCEL_FAILED },
      { status: 500 }
    )
  }
}
