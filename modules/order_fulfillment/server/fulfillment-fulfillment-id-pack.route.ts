import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import OrderFulfillmentService from '@kuraykaraaslan/order_fulfillment/server/order_fulfillment.service'

type Ctx = { params: Promise<{ tenantId: string; fulfillmentId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, fulfillmentId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const item = await OrderFulfillmentService.pack(tenantId, fulfillmentId)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
