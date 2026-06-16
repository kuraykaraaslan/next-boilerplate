// path: app/tenant/[tenantId]/api/audit-logs/cross-tenant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@nb/audit_log/server/audit_log.service';
import { AppError } from '@nb/common/server/app-error';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import Limiter from '@nb/limiter/server/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/audit-logs/cross-tenant
 * Cross-tenant aggregated audit view — ROOT TENANT ONLY (the service rejects
 * non-root callers). Requires ADMIN role on the root tenant.
 * Query params: tenantId, action, severity, fromDate, toDate, page, pageSize.
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

    const { logs, total } = await AuditLogService.queryCrossTenant(tenantId, {
      tenantId: searchParams.get('filterTenantId') ?? undefined,
      action:   searchParams.get('action')   ?? undefined,
      severity: (searchParams.get('severity') as any) ?? undefined,
      fromDate: searchParams.get('fromDate') ?? undefined,
      toDate:   searchParams.get('toDate')   ?? undefined,
      page:     searchParams.get('page')     ? parseInt(searchParams.get('page')!,     10) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20,
    });

    return NextResponse.json({ logs, total }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
