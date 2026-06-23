import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import OrderFulfillmentItemService from '@kuraykaraaslan/order_fulfillment/server/order_fulfillment.item.service'
import { AddFulfillmentItemDTO, GetFulfillmentItemsQuery } from '@kuraykaraaslan/order_fulfillment/server/order_fulfillment.dto'

type Ctx = { params: Promise<{ tenantId: string; fulfillmentId: string }> }

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, fulfillmentId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetFulfillmentItemsQuery.parse({
      page: sp.get('page') ?? undefined,
      pageSize: sp.get('pageSize') ?? undefined,
      search: sp.get('search') ?? undefined,
    })
    const { data, total } = await OrderFulfillmentItemService.listByParent(tenantId, fulfillmentId, query)
    return NextResponse.json({ data, total })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, fulfillmentId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = AddFulfillmentItemDTO.parse(await request.json())
    const item = await OrderFulfillmentItemService.addLine(tenantId, fulfillmentId, dto)
    return NextResponse.json({ item }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
