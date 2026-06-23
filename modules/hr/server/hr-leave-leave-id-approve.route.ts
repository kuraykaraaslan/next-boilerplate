import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import LeaveRequestService from '@kuraykaraaslan/hr/server/hr.leave.service'

type Ctx = { params: Promise<{ tenantId: string; leaveId: string }> }

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, leaveId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const item = await LeaveRequestService.approve(tenantId, leaveId)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
