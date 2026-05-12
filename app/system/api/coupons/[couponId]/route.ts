import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from 'next/server'
import UserSessionNextService from '@/modules_next/user_session/user_session.service.next'
import CouponService from '@/modules/coupon/coupon.service'
import { UpdateCouponRequestSchema } from '@/modules/coupon/coupon.dto'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'

type Params = { params: Promise<{ couponId: string }> }

/**
 * GET /system/api/coupons/[couponId]
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" })
    const { couponId } = await params
    const coupon = await CouponService.getById(couponId)
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    const status = error.message === COUPON_MESSAGES.NOT_FOUND ? 404 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.FETCH_FAILED },
      { status }
    )
  }
}

/**
 * PUT /system/api/coupons/[couponId]
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" })
    const { couponId } = await params

    const body = await request.json()
    const parsed = UpdateCouponRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const coupon = await CouponService.update(couponId, parsed.data)
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    const status = error.message === COUPON_MESSAGES.NOT_FOUND ? 404 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.UPDATE_FAILED },
      { status }
    )
  }
}

/**
 * DELETE /system/api/coupons/[couponId]
 * Archives the coupon (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" })
    const { couponId } = await params
    await CouponService.archive(couponId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.message === COUPON_MESSAGES.NOT_FOUND ? 404 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.DELETE_FAILED },
      { status }
    )
  }
}
