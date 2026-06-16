import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import StoreProductService from '@nb/store/server/store.product.service'

type Ctx = { params: Promise<{ tenantId: string; productId: string; imageId: string }> }

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId, imageId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    await StoreProductService.removeImage(tenantId, productId, imageId)
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
