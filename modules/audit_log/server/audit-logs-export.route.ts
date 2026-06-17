// path: app/tenant/[tenantId]/api/audit-logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AppError } from '@kuraykaraaslan/common/server/app-error';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/audit-logs/export?format=csv|ndjson
 * Bulk export of all (non-deleted) audit rows for this tenant (ADMIN role).
 * Optional query params: actorId (per-user SAR export), fromDate, toDate.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    await TenantSessionNextService.authenticateTenantByRequest({
      request,
      requiredTenantRole: 'ADMIN',
      tenantId,
    });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') === 'csv' ? 'csv' : 'ndjson';

    const { body, count } = await AuditLogService.exportLogs({
      tenantId,
      actorId:  searchParams.get('actorId')  ?? undefined,
      fromDate: searchParams.get('fromDate') ?? undefined,
      toDate:   searchParams.get('toDate')   ?? undefined,
      format,
    });

    const contentType = format === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson; charset=utf-8';
    const filename = `audit-logs-${tenantId}.${format === 'csv' ? 'csv' : 'ndjson'}`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Count': String(count),
      },
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
