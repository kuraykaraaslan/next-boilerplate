import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next'
import CouponService from '@/modules/coupon/coupon.service'
import { ApplyCouponRequestSchema } from '@/modules/coupon/coupon.dto'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'

type Params = { params: Promise<{ tenantId: string }> }

/**
 * POST /tenant/[tenantId]/api/coupons/apply
 * Apply a coupon code — validates, records redemption, increments usedCount.
 * Returns the redemption record + final discounted amount.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await params
    const { user } = await TenantSessionNextService.authenticateUserByRequest({ request, tenantId })

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
}
