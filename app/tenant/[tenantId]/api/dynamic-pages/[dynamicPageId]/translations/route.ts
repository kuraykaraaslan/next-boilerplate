import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@nb/limiter/server/limiter.service.next'
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next'
import DynamicPageService from '@nb/dynamic_page/server/dynamic_page.service'
import { UpsertTranslationDTO } from '@nb/dynamic_page/server/dynamic_page.dto'

type Ctx = { params: Promise<{ tenantId: string; dynamicPageId: string }> }

export async function GET(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, dynamicPageId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const translations = await DynamicPageService.getTranslations(tenantId, dynamicPageId)
    return NextResponse.json({ translations })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const rl = await Limiter.checkRateLimit(request)
  if (rl) return rl
  const { tenantId, dynamicPageId } = await params
  try {
    await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 403 })
  }
  try {
    const body = await request.json()
    const dto = UpsertTranslationDTO.parse(body)
    const translation = await DynamicPageService.upsertTranslation(tenantId, dynamicPageId, dto)
    return NextResponse.json({ translation })
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 })
  }
}
