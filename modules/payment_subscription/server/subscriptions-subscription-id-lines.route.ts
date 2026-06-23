import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import PaymentSubscriptionLineService from '@kuraykaraaslan/payment_subscription/server/payment_subscription.line.service'
import { CreateFeatureDTO } from '@kuraykaraaslan/payment_subscription/server/payment_subscription.dto'

type Ctx = { params: Promise<{ tenantId: string; subscriptionId: string }> }

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, subscriptionId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const { data, total } = await PaymentSubscriptionLineService.listByParent(tenantId, subscriptionId)
    return NextResponse.json({ data, total })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, subscriptionId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateFeatureDTO.parse(await request.json())
    const item = await PaymentSubscriptionLineService.addLine(tenantId, subscriptionId, dto)
    return NextResponse.json({ item }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
