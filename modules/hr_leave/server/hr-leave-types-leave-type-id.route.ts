import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import LeaveTypeService from '@kuraykaraaslan/hr_leave/server/hr_leave.leave-type.service'
import { UpdateLeaveTypeDTO } from '@kuraykaraaslan/hr_leave/server/hr_leave.dto'

type Ctx = { params: Promise<{ tenantId: string; leaveTypeId: string }> }

async function auth(request: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, leaveTypeId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const item = await LeaveTypeService.getById(tenantId, leaveTypeId)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 404 }) }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, leaveTypeId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = UpdateLeaveTypeDTO.parse(await request.json())
    const item = await LeaveTypeService.update(tenantId, leaveTypeId, dto)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, leaveTypeId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    await LeaveTypeService.delete(tenantId, leaveTypeId)
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
