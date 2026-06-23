import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import ProductReviewService from '@kuraykaraaslan/product_review/server/product_review.service'
import { ReviewTransitionDTO } from '@kuraykaraaslan/product_review/server/product_review.dto'

type Ctx = { params: Promise<{ tenantId: string; reviewId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, reviewId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = ReviewTransitionDTO.parse(await request.json().catch(() => ({})))
    const item = await ProductReviewService.approve(tenantId, reviewId, dto.note)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
