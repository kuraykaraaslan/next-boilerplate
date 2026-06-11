// path: app/tenant/[tenantId]/api/audit-logs/anonymize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@/modules/audit_log/audit_log.service';
import { AppError } from '@/modules/common/app-error';
import AuditLogMessages from '@/modules/audit_log/audit_log.messages';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import Limiter from '@/modules_next/limiter/limiter.service.next';

/**
 * POST /tenant/[tenantId]/api/audit-logs/anonymize
 * Right-to-erasure (GDPR Art. 17): pseudonymize an actor across the tenant's
 * audit trail (requires ADMIN role). Body: { actorId: string }.
 */
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    if (!body?.actorId) {
      return NextResponse.json({ message: AuditLogMessages.ACTOR_REQUIRED }, { status: 400 });
    }

    const result = await AuditLogService.anonymizeActor({ tenantId, actorId: body.actorId });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
