// path: app/tenant/[tenantId]/api/audit-logs/purge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import AuditLogService from '@kuraykaraaslan/audit_log/server/audit_log.service';
import { AppError } from '@kuraykaraaslan/common/server/app-error';
import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';

/**
 * POST /tenant/[tenantId]/api/audit-logs/purge
 * Run the retention purge for this tenant (requires ADMIN role). Deletes rows
 * older than `auditLogRetentionDays`; no-op when retention is keep-forever.
 * Body (optional): { archive?: boolean } — serialize the batch to NDJSON first.
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
    const result = await AuditLogService.purgeExpired({ tenantId, archive: Boolean(body?.archive) });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ message: error.message }, { status });
  }
}
