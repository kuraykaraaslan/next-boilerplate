import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import StorePublicService from '@nb/store/server/store.public.service'
import { PUBLIC_CACHE, NO_STORE } from '@nb/common/server/utils/cacheHeaders'

/**
 * GET /tenant/[tenantId]/api/storefront/products
 * Public customer-facing product listing (ACTIVE + country-available only).
 * Query: page, pageSize, categoryId, search, isFeatured, locale, currency, country
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request, 'api'); if (rl) return rl
  const { tenantId } = await params
  try {
    const sp = new URL(request.url).searchParams
    const result = await StorePublicService.listProducts(tenantId, {
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
      categoryId: sp.get('categoryId') ?? undefined,
      search: sp.get('search') ?? undefined,
      isFeatured: sp.get('isFeatured') ? sp.get('isFeatured') === 'true' : undefined,
    }, {
      locale: sp.get('locale') ?? undefined,
      currency: sp.get('currency') ?? undefined,
      country: sp.get('country') ?? undefined,
    })
    // Free-text search produces unbounded permutations — keep those off the CDN.
    const headers = sp.get('search') ? NO_STORE : PUBLIC_CACHE.short
    return NextResponse.json(result, { headers })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
