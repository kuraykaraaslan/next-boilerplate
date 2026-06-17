// path: app/tenant/[tenantId]/api/audit-logs/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AppError } from '@kuraykaraaslan/common/server/app-error';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';

/**
 * GET /tenant/[tenantId]/api/audit-logs/verify
 * Verify the append-only hash chain for this tenant (requires ADMIN role).
 * Returns { ok, checked, brokenAt }.
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

    const result = await AuditLogService.verifyChain(tenantId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
