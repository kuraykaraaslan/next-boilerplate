import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import CouponService from '@/modules/coupon/coupon.service'
import { UpdateCouponRequestSchema } from '@/modules/coupon/coupon.dto'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'

type Params = { params: Promise<{ tenantId: string; couponId: string }> }

/**
 * GET /tenant/[tenantId]/api/coupons/[couponId]
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

        const { tenantId, couponId } = await params


    try {


      await TenantSessionNextService.authenticateTenantByRequest({


        request, tenantId, requiredTenantRole: 'ADMIN',


      });


    } catch (err: any) {


      return NextResponse.json({ success: false, message: err.message }, { status: 403 });


    }
    const coupon = await CouponService.getById(tenantId, couponId)
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
 * PUT /tenant/[tenantId]/api/coupons/[couponId]
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
        const { tenantId, couponId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    const body = await request.json()
    const parsed = UpdateCouponRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const coupon = await CouponService.update(tenantId, couponId, parsed.data)
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
 * DELETE /tenant/[tenantId]/api/coupons/[couponId]
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
        const { tenantId, couponId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
    await CouponService.archive(tenantId, couponId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error.message === COUPON_MESSAGES.NOT_FOUND ? 404 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.DELETE_FAILED },
      { status }
    )
  }
}
