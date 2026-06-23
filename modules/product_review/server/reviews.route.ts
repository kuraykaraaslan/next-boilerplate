import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import ProductReviewService from '@kuraykaraaslan/product_review/server/product_review.service'
import { CreateReviewDTO, GetReviewsQuery } from '@kuraykaraaslan/product_review/server/product_review.dto'

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetReviewsQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      productId: sp.get('productId') ?? undefined,
      userId: sp.get('userId') ?? undefined,
      status: sp.get('status') ?? undefined,
      minRating: sp.get('minRating') ? Number(sp.get('minRating')) : undefined,
      sort: sp.get('sort') ?? undefined,
    })
    const { data, total } = await ProductReviewService.list(tenantId, query)
    return NextResponse.json({ data, total })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateReviewDTO.parse(await request.json())
    const item = await ProductReviewService.create(tenantId, dto)
    return NextResponse.json({ item }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
