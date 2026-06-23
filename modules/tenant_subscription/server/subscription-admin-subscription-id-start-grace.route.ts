import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import TenantSubscriptionAdminService from '@kuraykaraaslan/tenant_subscription/server/tenant_subscription.admin.service'

type Ctx = { params: Promise<{ tenantId: string; subscriptionId: string }> }

/** POST /tenant/[tenantId]/api/subscription/admin/[subscriptionId]/start-grace */
export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, subscriptionId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const item = await TenantSubscriptionAdminService.startGrace(tenantId, subscriptionId)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
