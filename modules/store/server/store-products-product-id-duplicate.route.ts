import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import StoreProductService from '@kuraykaraaslan/store/server/store.product.service'

type Ctx = { params: Promise<{ tenantId: string; productId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const product = await StoreProductService.duplicateProduct(tenantId, productId)
    return NextResponse.json({ product }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
