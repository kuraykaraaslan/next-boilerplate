import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import StoreCategoryService from '@kuraykaraaslan/store/server/store.category.service'
import { CreateSpecDTO } from '@kuraykaraaslan/store/server/store.dto'

type Ctx = { params: Promise<{ tenantId: string; categoryId: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, categoryId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const category = await StoreCategoryService.getCategory(tenantId, categoryId, true) as any
    return NextResponse.json({ specs: category.specs ?? [] })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 404 }) }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, categoryId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateSpecDTO.parse(await request.json())
    const spec = await StoreCategoryService.upsertSpec(tenantId, categoryId, dto)
    return NextResponse.json({ spec }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
