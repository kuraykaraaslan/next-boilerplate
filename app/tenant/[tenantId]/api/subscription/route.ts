import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'
import { z } from 'zod'

// Schema for purchase request
const PurchaseSubscriptionRequestSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']),
  provider: z.enum(['STRIPE', 'PAYPAL', 'IYZICO']).optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
})

/**
 * GET /tenant/[tenantId]/api/subscription
 * Get current tenant subscription
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
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
 * Initiate subscription purchase - returns checkout URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: "ADMIN",
      tenantId,
    })

    const body = await request.json()
    const parsed = PurchaseSubscriptionRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    // Build base URL from request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`

    const result = await TenantSubscriptionService.purchaseSubscription({
      tenantId,
      planId: parsed.data.planId,
      billingInterval: parsed.data.billingInterval,
      successUrl: `${baseUrl}/tenant/${tenantId}/admin/settings?tab=subscription&paymentSuccess=true`,
      cancelUrl: `${baseUrl}/tenant/${tenantId}/admin/settings?tab=subscription&paymentCancelled=true`,
      provider: parsed.data.provider,
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PAYMENT_INITIATION_FAILED },
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
      requiredTenantRole: "ADMIN",
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
