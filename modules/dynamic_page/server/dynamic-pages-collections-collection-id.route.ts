import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import DynamicCollectionService from '@kuraykaraaslan/dynamic_page/server/dynamic_collection.service'
import { UpdateCollectionDTO } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.dto'
import { AppError } from '@kuraykaraaslan/common/server/app-error'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; collectionId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, collectionId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const collection = await DynamicCollectionService.getCollection(tenantId, collectionId)
    return NextResponse.json({ collection })
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; collectionId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, collectionId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  const body = await request.json()
  const parsed = UpdateCollectionDTO.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const collection = await DynamicCollectionService.updateCollection(tenantId, collectionId, parsed.data)
    return NextResponse.json({ collection })
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; collectionId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, collectionId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    await DynamicCollectionService.deleteCollection(tenantId, collectionId)
    return NextResponse.json({ message: 'Collection deleted' })
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}
