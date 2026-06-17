import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import StoreCategoryService from '@kuraykaraaslan/store/server/store.category.service'
import { CreateCategoryDTO, GetCategoriesQuery } from '@kuraykaraaslan/store/server/store.dto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetCategoriesQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 50,
      parentId: sp.get('parentId') ?? undefined,
      isActive: sp.get('isActive') ? sp.get('isActive') === 'true' : undefined,
      withSpecs: sp.get('withSpecs') === 'true',
      withChildren: sp.get('withChildren') === 'true',
    })
    const result = await StoreCategoryService.listCategories(tenantId, query)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const body = await request.json()
    const dto = CreateCategoryDTO.parse(body)
    const category = await StoreCategoryService.createCategory(tenantId, dto)
    return NextResponse.json({ category }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 })
  }
}
