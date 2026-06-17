import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import DynamicPageService from '@kuraykaraaslan/dynamic_page/server/dynamic_page.service'
import { CreateBlockDTO } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.dto'

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
    const blocks = await DynamicPageService.listBlocks(tenantId)
    return NextResponse.json({ blocks })
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
    const dto = CreateBlockDTO.parse(body)
    const block = await DynamicPageService.createBlock(tenantId, dto)
    return NextResponse.json({ block }, { status: 201 })
  } catch (err: any) {
    const status = err.message?.includes('taken') ? 409 : 400
    return NextResponse.json({ message: err.message }, { status })
  }
}
