import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import StoreProductService from '@/modules/store/store.product.service'
import { CreateProductDTO, GetProductsQuery } from '@/modules/store/store.dto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    let specFilters: unknown = undefined
    const rawSpecFilters = sp.get('specFilters')
    if (rawSpecFilters) {
      try { specFilters = JSON.parse(rawSpecFilters) } catch { specFilters = undefined }
    }
    const query = GetProductsQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      categoryId: sp.get('categoryId') ?? undefined,
      status: sp.get('status') ?? undefined,
      isFeatured: sp.get('isFeatured') ? sp.get('isFeatured') === 'true' : undefined,
      search: sp.get('search') ?? undefined,
      specFilters,
    })
    const result = await StoreProductService.listProducts(tenantId, query)
    return NextResponse.json(result)
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateProductDTO.parse(await request.json())
    const product = await StoreProductService.createProduct(tenantId, dto)
    return NextResponse.json({ product }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
