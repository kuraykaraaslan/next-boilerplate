import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import StoreBundleService from '@nb/store/server/store.bundle.service'
import { UpdateBundleDTO } from '@nb/store/server/store.dto'

type Ctx = { params: Promise<{ tenantId: string; bundleId: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, bundleId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const withItems = new URL(request.url).searchParams.get('withItems') === 'true'
    const bundle = await StoreBundleService.getBundle(tenantId, bundleId, withItems)
    return NextResponse.json({ bundle })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 404 }) }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, bundleId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const dto = UpdateBundleDTO.parse(await request.json())
    const bundle = await StoreBundleService.updateBundle(tenantId, bundleId, dto)
    return NextResponse.json({ bundle })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId, bundleId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    await StoreBundleService.deleteBundle(tenantId, bundleId)
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 400 }) }
}
