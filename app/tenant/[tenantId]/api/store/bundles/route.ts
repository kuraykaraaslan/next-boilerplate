import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import StoreBundleService from '@/modules/store/store.bundle.service'
import { CreateBundleDTO, GetBundlesQuery } from '@/modules/store/store.dto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetBundlesQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      status: sp.get('status') ?? undefined,
      search: sp.get('search') ?? undefined,
    })
    const result = await StoreBundleService.listBundles(tenantId, query)
    return NextResponse.json(result)
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = CreateBundleDTO.parse(await request.json())
    const bundle = await StoreBundleService.createBundle(tenantId, dto)
    return NextResponse.json({ bundle }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
