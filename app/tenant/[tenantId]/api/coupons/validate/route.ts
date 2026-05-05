import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next'
import CouponService from '@/modules/coupon/coupon.service'
import { ValidateCouponRequestSchema } from '@/modules/coupon/coupon.dto'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'

type Params = { params: Promise<{ tenantId: string }> }

/**
 * POST /tenant/[tenantId]/api/coupons/validate
 * Validate a coupon code and return discount info (authenticated tenant member)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { tenantId } = await params
    await TenantSessionNextService.authenticateUserByRequest({ request, tenantId })

    const body = await request.json()
    const parsed = ValidateCouponRequestSchema.safeParse({ ...body, tenantId })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const result = await CouponService.validate(parsed.data)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}
