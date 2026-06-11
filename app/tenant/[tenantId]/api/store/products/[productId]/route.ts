import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import StoreProductService from '@/modules/store/store.product.service'
import { UpdateProductDTO } from '@/modules/store/store.dto'

type Ctx = { params: Promise<{ tenantId: string; productId: string }> }

async function auth(req: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request: req, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const detail = new URL(request.url).searchParams.get('detail') === 'true'
    const product = detail
      ? await StoreProductService.getProductDetail(tenantId, productId)
      : await StoreProductService.getProduct(tenantId, productId)
    return NextResponse.json({ product })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 404 }) }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = UpdateProductDTO.parse(await request.json())
    const product = await StoreProductService.updateProduct(tenantId, productId, dto)
    return NextResponse.json({ product })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    await StoreProductService.deleteProduct(tenantId, productId)
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
