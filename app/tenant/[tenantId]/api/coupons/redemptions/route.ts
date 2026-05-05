import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from 'next/server'
import TenantSessionNextService from '@/modules/tenant_session/tenant_session.service.next'
import CouponService from '@/modules/coupon/coupon.service'
import { COUPON_MESSAGES } from '@/modules/coupon/coupon.messages'

type Params = { params: Promise<{ tenantId: string }> }

/**
 * GET /tenant/[tenantId]/api/coupons/redemptions
 * List coupon redemption history for this tenant (ADMIN+)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { tenantId } = await params
    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
      requiredTenantRole: 'ADMIN',
    })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '0')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '20'), 100)

    const result = await CouponService.getRedemptionsByTenant(tenantId, page, pageSize)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || COUPON_MESSAGES.FETCH_FAILED },
      { status: 500 }
    )
  }
}
