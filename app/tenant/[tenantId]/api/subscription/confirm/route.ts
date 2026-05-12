import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import TenantSubscriptionService from '@/modules/tenant_subscription/tenant_subscription.service'
import { SUBSCRIPTION_MESSAGES } from '@/modules/tenant_subscription/tenant_subscription.messages'
import { z } from 'zod'

const ConfirmPaymentRequestSchema = z.object({
  paymentId: z.string().uuid('Invalid payment ID'),
})

/**
 * POST /tenant/[tenantId]/api/subscription/confirm
 * Confirm payment and activate subscription
 */
export async function POST(
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

    const body = await request.json()
    const parsed = ConfirmPaymentRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const subscription = await TenantSubscriptionService.confirmPayment(parsed.data.paymentId)
    return NextResponse.json({ success: true, subscription })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || SUBSCRIPTION_MESSAGES.PAYMENT_CONFIRMATION_FAILED },
      { status: 500 }
    )
  }
}
