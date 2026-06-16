import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import StoreBundleService from '@nb/store/server/store.bundle.service'
import { AddBundleItemDTO } from '@nb/store/server/store.dto'

type Ctx = { params: Promise<{ tenantId: string; bundleId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, bundleId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = AddBundleItemDTO.parse(await request.json())
    const item = await StoreBundleService.addBundleItem(tenantId, bundleId, dto)
    return NextResponse.json({ item }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
