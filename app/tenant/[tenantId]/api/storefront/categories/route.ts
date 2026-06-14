import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import StorePublicService from '@/modules/store/store.public.service'

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
    return NextResponse.json({ categories })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
