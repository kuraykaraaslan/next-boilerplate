import Limiter from '@nb/limiter/server/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import CouponService from '@nb/coupon/server/coupon.service'
import { ValidateCouponRequestSchema } from '@nb/coupon/server/coupon.dto'
import { COUPON_MESSAGES } from '@nb/coupon/server/coupon.messages'

type Params = { params: Promise<{ tenantId: string }> }

/**
 * POST /tenant/[tenantId]/api/coupons/validate
 * Validate a coupon code and return discount info (authenticated tenant member)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'USER' })

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
