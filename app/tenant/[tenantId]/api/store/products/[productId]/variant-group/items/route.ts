import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import StoreVariantService from '@nb/store/server/store.variant.service'
import { AddVariantGroupItemDTO } from '@nb/store/server/store.dto'

type Ctx = { params: Promise<{ tenantId: string; productId: string }> }

async function auth(req: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request: req, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = AddVariantGroupItemDTO.parse(await request.json())
    const result = await StoreVariantService.addToVariantGroup(tenantId, productId, dto)
    return NextResponse.json(result, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
