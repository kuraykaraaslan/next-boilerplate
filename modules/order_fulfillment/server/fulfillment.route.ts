import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import OrderFulfillmentService from '@kuraykaraaslan/order_fulfillment/server/order_fulfillment.service'
import { CreateFulfillmentDTO, GetFulfillmentsQuery } from '@kuraykaraaslan/order_fulfillment/server/order_fulfillment.dto'

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetFulfillmentsQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      orderId: sp.get('orderId') ?? undefined,
      status: sp.get('status') ?? undefined,
      carrier: sp.get('carrier') ?? undefined,
      trackingNumber: sp.get('trackingNumber') ?? undefined,
    })
    const { data, total } = await OrderFulfillmentService.list(tenantId, query)
    return NextResponse.json({ data, total })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateFulfillmentDTO.parse(await request.json())
    const item = await OrderFulfillmentService.create(tenantId, dto)
    return NextResponse.json({ item }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
