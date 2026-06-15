import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import StorePublicService from '@/modules/store/store.public.service'
import { PUBLIC_CACHE } from '@/modules_next/common/utils/cacheHeaders'

/**
 * GET /tenant/[tenantId]/api/storefront/products/[slug]
 * Public customer-facing product detail by slug (ACTIVE + country-available).
 * Query: locale, currency, country
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; slug: string }> },
) {
  const rl = await Limiter.checkRateLimit(request, 'api'); if (rl) return rl
  const { tenantId, slug } = await params
  try {
    const sp = new URL(request.url).searchParams
    const product = await StorePublicService.getProductBySlug(tenantId, slug, {
      locale: sp.get('locale') ?? undefined,
      currency: sp.get('currency') ?? undefined,
      country: sp.get('country') ?? undefined,
    })
    return NextResponse.json({ product }, { headers: PUBLIC_CACHE.medium })
  } catch (e: any) {
    const status = e?.statusCode ?? 500
    return NextResponse.json({ message: e.message }, { status })
  }
}
