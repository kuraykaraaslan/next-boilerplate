import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import BlogCategoryService from '@nb/blog/server/blog.category.service'
import { CreateCategoryDTO, GetCategoriesQuery } from '@nb/blog/server/blog.dto'

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetCategoriesQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      search: sp.get('search') ?? undefined,
    })
    const result = await BlogCategoryService.list(tenantId, query)
    return NextResponse.json(result)
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateCategoryDTO.parse(await request.json())
    const category = await BlogCategoryService.create(tenantId, dto)
    return NextResponse.json({ category }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
