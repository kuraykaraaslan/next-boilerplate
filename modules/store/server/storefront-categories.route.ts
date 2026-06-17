import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import StorePublicService from '@kuraykaraaslan/store/server/store.public.service'
import { PUBLIC_CACHE } from '@kuraykaraaslan/common/server/utils/cacheHeaders'

/**
 * GET /tenant/[tenantId]/api/storefront/categories
 * Public localized category tree (active categories only). Query: locale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request, 'api'); if (rl) return rl
  const { tenantId } = await params
  try {
    const sp = new URL(request.url).searchParams
    const categories = await StorePublicService.listCategories(tenantId, { locale: sp.get('locale') ?? undefined })
    return NextResponse.json({ categories }, { headers: PUBLIC_CACHE.medium })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
