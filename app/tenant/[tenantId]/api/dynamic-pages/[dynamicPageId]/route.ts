import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import DynamicPageService from '@/modules/dynamic_page/dynamic_page.service'
import { UpdatePageDTO } from '@/modules/dynamic_page/dynamic_page.dto'

type Ctx = { params: Promise<{ tenantId: string; dynamicPageId: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, dynamicPageId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const page = await DynamicPageService.getPage(tenantId, dynamicPageId)
    return NextResponse.json({ page })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, dynamicPageId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const body = await request.json()
    const dto = UpdatePageDTO.parse(body)
    const page = await DynamicPageService.updatePage(tenantId, dynamicPageId, dto)
    return NextResponse.json({ page })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : err.message?.includes('taken') ? 409 : 400
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, dynamicPageId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    await DynamicPageService.deletePage(tenantId, dynamicPageId)
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}
