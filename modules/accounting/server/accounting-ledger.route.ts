import { NextRequest, NextResponse } from 'next/server'
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next'
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next'
import JournalLineService from '@kuraykaraaslan/accounting/server/accounting.ledger-line.service'
import { GetJournalLinesQuery } from '@kuraykaraaslan/accounting/server/accounting.dto'

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const rl = await Limiter.checkRateLimit(request); if (rl) return rl
  const { tenantId } = await params
  try { await TenantSessionNextService.authenticateTenantByRequest({ request, tenantId, requiredTenantRole: 'ADMIN' }) }
  catch (e: any) { return NextResponse.json({ message: e.message }, { status: 403 }) }
  try {
    const sp = new URL(request.url).searchParams
    const query = GetJournalLinesQuery.parse({
      page: sp.get('page') ? Number(sp.get('page')) : 0,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 20,
    })
    const { data, total } = await JournalLineService.list(tenantId, query)
    return NextResponse.json({ data, total })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: e.statusCode ?? 400 }) }
}
