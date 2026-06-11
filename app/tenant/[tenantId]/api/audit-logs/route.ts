// path: app/tenant/[tenantId]/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AppError } from '@/modules/common/app-error';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/audit-logs
 * List audit logs scoped to this tenant (requires ADMIN role).
 *
 * Query params: page, pageSize, actorId, action, severity, resourceType,
 * resourceId, fromDate, toDate
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
      requiredTenantRole: "ADMIN",
      tenantId,
    });

    const { searchParams } = new URL(request.url);

    const { logs, total } = await AuditLogService.getAll({
      tenantId,
      actorId:      searchParams.get('actorId')      ?? undefined,
      action:       searchParams.get('action')       ?? undefined,
      severity:     (searchParams.get('severity') as any) ?? undefined,
      resourceType: searchParams.get('resourceType') ?? undefined,
      resourceId:   searchParams.get('resourceId')   ?? undefined,
      fromDate:     searchParams.get('fromDate')     ?? undefined,
      toDate:       searchParams.get('toDate')       ?? undefined,
      page:         searchParams.get('page')     ? parseInt(searchParams.get('page')!,     10) : 1,
      pageSize:     searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20,
    });

    return NextResponse.json({ logs, total }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
