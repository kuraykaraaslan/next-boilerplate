import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from 'next/server'
import UserSessionNextService from '@/modules/user_session/user_session.service.next'
import CouponService from '@/modules/coupon/coupon.service'
import { CreateCouponRequestSchema, GetCouponsQuerySchema } from '@/modules/coupon/coupon.dto'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'

/**
 * GET /system/api/coupons
 * List all coupons (admin only)
 */
export async function GET(request: NextRequest) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ['system:admin'] })

    const { searchParams } = new URL(request.url)
    const parsed = GetCouponsQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const result = await CouponService.getAll(parsed.data)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /system/api/coupons
 * Create a new coupon (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ['system:admin'] })

    const body = await request.json()
    const parsed = CreateCouponRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const coupon = await CouponService.create(parsed.data)
    return NextResponse.json({ success: true, coupon }, { status: 201 })
  } catch (error: any) {
    const status = error.message === COUPON_MESSAGES.CODE_EXISTS ? 409 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.CREATE_FAILED },
      { status }
    )
  }
}
