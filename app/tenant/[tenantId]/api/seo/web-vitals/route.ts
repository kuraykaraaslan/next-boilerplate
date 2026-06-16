import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import { SeoWebVitalsService, RecordWebVitalDTO } from '@nb/seo/server'

/**
 * POST /tenant/[tenantId]/api/seo/web-vitals
 * Public Core Web Vitals beacon ingestion (called by the frontend web-vitals
 * reporter). No auth — it's anonymous field RUM data; rate-limited.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const rl = await Limiter.checkRateLimit(request, 'api'); if (rl) return rl
  const { tenantId } = await params
  try {
    const dto = RecordWebVitalDTO.parse(await request.json())
    await SeoWebVitalsService.record(tenantId, dto)
    // 204-style ack; beacons ignore the body.
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 400 })
  }
}

/**
 * GET /tenant/[tenantId]/api/seo/web-vitals
 * Admin CWV report (optionally ?country=XX).
 */
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
    const country = new URL(request.url).searchParams.get('country') ?? undefined
    const [report, countries] = await Promise.all([
      SeoWebVitalsService.getReport(tenantId, { country }),
      SeoWebVitalsService.reportedCountries(tenantId),
    ])
    return NextResponse.json({ report, countries })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
