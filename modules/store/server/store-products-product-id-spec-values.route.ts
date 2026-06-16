import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import StoreProductService from '@nb/store/server/store.product.service'
import { SetSpecValuesDTO } from '@nb/store/server/store.dto'

type Ctx = { params: Promise<{ tenantId: string; productId: string }> }

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = SetSpecValuesDTO.parse(await request.json())
    const specValues = await StoreProductService.setSpecValues(tenantId, productId, dto)
    return NextResponse.json({ specValues })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
