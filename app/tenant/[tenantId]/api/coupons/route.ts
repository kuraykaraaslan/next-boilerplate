import Limiter from '@/modules_next/limiter/limiter.service.next';
import { NextRequest, NextResponse } from 'next/server'
import CouponService from '@/modules/coupon/coupon.service'
import { CreateCouponRequestSchema, GetCouponsQuerySchema } from '@/modules/coupon/coupon.dto'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'

/**
 * GET /tenant/[tenantId]/api/coupons
 * Lists this tenant's coupons (admin only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;

    const { tenantId } = await params
    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
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

    const result = await CouponService.getAll(tenantId, parsed.data)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}

/**
 * POST /tenant/[tenantId]/api/coupons
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const { tenantId } = await params
    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }
    const body = await request.json()
    const parsed = CreateCouponRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }

    const coupon = await CouponService.create(tenantId, parsed.data)
    return NextResponse.json({ success: true, coupon }, { status: 201 })
  } catch (error: any) {
    const status = error.message === COUPON_MESSAGES.CODE_EXISTS ? 409 : 500
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.CREATE_FAILED },
      { status }
    )
  }
}
