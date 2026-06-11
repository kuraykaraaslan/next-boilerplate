import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import StoreCategoryService from '@/modules/store/store.category.service'
import { UpdateCategoryDTO } from '@/modules/store/store.dto'

type Ctx = { params: Promise<{ tenantId: string; categoryId: string }> }

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, categoryId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const withSpecs = new URL(request.url).searchParams.get('withSpecs') === 'true'
    const category = await StoreCategoryService.getCategory(tenantId, categoryId, withSpecs)
    return NextResponse.json({ category })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 404 }) }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, categoryId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = UpdateCategoryDTO.parse(await request.json())
    const category = await StoreCategoryService.updateCategory(tenantId, categoryId, dto)
    return NextResponse.json({ category })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, categoryId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    await StoreCategoryService.deleteCategory(tenantId, categoryId)
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
