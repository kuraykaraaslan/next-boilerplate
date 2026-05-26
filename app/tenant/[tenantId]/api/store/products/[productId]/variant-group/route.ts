import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import { tenantDataSourceFor } from '@/modules/db/db.tenant'
import { StoreProduct } from '@/modules/store/entities/store_product.entity'
import StoreService from '@/modules/store/store.service'

type Ctx = { params: Promise<{ tenantId: string; productId: string }> }

async function auth(req: NextRequest, tenantId: string) {
  await TenantSessionNextService.authenticateTenantByRequest({ request: req, tenantId, requiredTenantRole: 'ADMIN' })
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, productId } = await params
  try { await auth(request, tenantId) } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const result = await StoreService.getVariantGroupForProduct(tenantId, productId)
    if (!result) return NextResponse.json({ group: null, items: [], products: {} })

    const ds = await tenantDataSourceFor(tenantId)
    const productRepo = ds.getRepository(StoreProduct)
    const products = result.items.length > 0
      ? await productRepo.findBy(result.items.map((i) => ({ tenantId, productId: i.productId })))
      : []
    const productMap = Object.fromEntries(products.map((p) => [p.productId, {
      productId: p.productId, name: p.name, basePrice: Number(p.basePrice), currency: p.currency,
      status: p.status, sku: p.sku ?? null, stockQuantity: p.stockQuantity ?? null,
    }]))

    return NextResponse.json({ group: result.group, items: result.items, products: productMap })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
