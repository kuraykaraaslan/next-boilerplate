import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import DynamicPageService from '@nb/dynamic_page/server/dynamic_page.service'
import { UpdateBlockDTO } from '@nb/dynamic_page/server/dynamic_page.dto'

type Ctx = { params: Promise<{ tenantId: string; blockId: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, blockId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const block = await DynamicPageService.getBlock(tenantId, blockId)
    return NextResponse.json({ block })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, blockId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const body = await request.json()
    const dto = UpdateBlockDTO.parse(body)
    const block = await DynamicPageService.updateBlock(tenantId, blockId, dto)
    return NextResponse.json({ block })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : err.message?.includes('system') ? 403 : 400
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, blockId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    await DynamicPageService.deleteBlock(tenantId, blockId)
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : err.message?.includes('system') ? 403 : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}
