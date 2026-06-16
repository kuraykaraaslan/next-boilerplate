import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import CouponService from '@nb/coupon/server/coupon.service'
import { ApplyCouponRequestSchema } from '@nb/coupon/server/coupon.dto'
import { COUPON_MESSAGES } from '@nb/coupon/server/coupon.messages'
import { withIdempotency } from '@nb/redis_idempotency/server/withIdempotency'

type Params = { params: Promise<{ tenantId: string }> }

/**
 * POST /tenant/[tenantId]/api/coupons/apply
 * Apply a coupon code — validates, records redemption, increments usedCount.
 * Returns the redemption record + final discounted amount.
 * Idempotent via the `Idempotency-Key` header (and service-level guard).
 */
export const POST = withIdempotency(async function POST(request: NextRequest, { params }: Params) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params
    const { user } = await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'USER' })

    const body = await request.json()
    const parsed = ApplyCouponRequestSchema.safeParse({
      ...body,
      tenantId,
      userId: user.userId,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const redemption = await CouponService.apply(parsed.data)
    return NextResponse.json({ success: true, redemption }, { status: 201 })
  } catch (error: any) {
    const status = error.message?.includes('not') || error.message?.includes('exceed') ? 400 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.APPLY_FAILED },
      { status }
    )
  }
})
