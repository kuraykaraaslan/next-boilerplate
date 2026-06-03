import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import StoreVariantService from '@/modules/store/store.variant.service'
import { UpdateVariantGroupItemDTO } from '@/modules/store/store.dto'

type Ctx = { params: Promise<{ tenantId: string; productId: string; itemId: string }> }

async function auth(req: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request: req, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, itemId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = UpdateVariantGroupItemDTO.parse(await request.json())
    const item = await StoreVariantService.updateVariantGroupItem(tenantId, itemId, dto)
    return NextResponse.json({ item })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, itemId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    await StoreVariantService.removeFromVariantGroup(tenantId, itemId)
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
