import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import DynamicCollectionService from '@kuraykaraaslan/dynamic_page/server/dynamic_collection.service'
import { CreateCollectionItemDTO } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.dto'
import { ListCollectionItemsQuerySchema } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.types'
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
    const sp = new URL(request.url).searchParams
    const query = ListCollectionItemsQuerySchema.parse({
      page: sp.get('page') ?? undefined,
      pageSize: sp.get('pageSize') ?? undefined,
      sort: sp.get('sort') ?? undefined,
    })
    const result = await DynamicCollectionService.listItems(tenantId, collectionId, query)
    return NextResponse.json(result)
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}

export async function POST(
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
  const parsed = CreateCollectionItemDTO.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }
  try {
    const item = await DynamicCollectionService.createItem(tenantId, collectionId, parsed.data)
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: any) {
    const status = err instanceof AppError ? err.statusCode : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}
