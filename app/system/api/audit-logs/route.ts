// path: app/system/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import UserSessionNextService from '@/modules/user_session/user_session.service.next';
import Limiter from '@/libs/limiter';

/**
 * GET /system/api/audit-logs
 * List audit logs across all tenants (requires system ADMIN role).
 *
 * Query params: page, pageSize, tenantId, actorId, action, resourceType, resourceId
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:admin"],
    });

    const { searchParams } = new URL(request.url);

    const { logs, total } = await AuditLogService.getAll({
      tenantId:     searchParams.get('tenantId')     ?? undefined,
      actorId:      searchParams.get('actorId')      ?? undefined,
      action:       searchParams.get('action')       ?? undefined,
      resourceType: searchParams.get('resourceType') ?? undefined,
      resourceId:   searchParams.get('resourceId')   ?? undefined,
      page:         searchParams.get('page')     ? parseInt(searchParams.get('page')!,     10) : 1,
      pageSize:     searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20,
    });

    return NextResponse.json({ logs, total }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
