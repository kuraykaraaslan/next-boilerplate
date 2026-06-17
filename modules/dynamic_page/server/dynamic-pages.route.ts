import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import DynamicPageService from '@kuraykaraaslan/dynamic_page/server/dynamic_page.service'
import { CreatePageDTO } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.dto'
import { ListPagesQuerySchema } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.types'

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
    const query = ListPagesQuerySchema.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 50,
      status: sp.get('status') ?? undefined,
      search: sp.get('search') ?? undefined,
    })
    const result = await DynamicPageService.listPages(tenantId, query)
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
    const dto = CreatePageDTO.parse(body)
    const page = await DynamicPageService.createPage(tenantId, dto)
    return NextResponse.json({ page }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 })
  }
}
