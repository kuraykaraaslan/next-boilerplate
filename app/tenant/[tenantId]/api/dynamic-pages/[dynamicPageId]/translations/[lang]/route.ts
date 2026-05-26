import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@/modules_next/limiter/limiter.service.next'
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next'
import DynamicPageService from '@/modules/dynamic_page/dynamic_page.service'

type Ctx = { params: Promise<{ tenantId: string; dynamicPageId: string; lang: string }> }

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, dynamicPageId, lang } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    await DynamicPageService.deleteTranslation(tenantId, dynamicPageId, lang)
    return new NextResponse(null, { status: 204 })
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 500
    return NextResponse.json({ message: err.message }, { status })
  }
}
