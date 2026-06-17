import { NextRequest, NextResponse } from 'next/server';
import TenantDeletionService from '@kuraykaraaslan/tenant/server/tenant.deletion.service';
import Limiter from '@kuraykaraaslan/limiter/server/limiter.service.next';
import Logger from '@kuraykaraaslan/logger';
import { authenticateAdminRequest } from '@kuraykaraaslan/auth/server/auth.admin-guard.next';

/**
 * POST /tenant/[tenantId]/api/tenants/[targetTenantId]/deletion-request
 * Root-tenant admin: schedule or cancel deletion of a target tenant.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; targetTenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const { targetTenantId } = await params;

    const body = await request.json().catch(() => ({}));
    const cancel = body.cancel === true;

    if (cancel) {
      await TenantDeletionService.cancelDeletion(targetTenantId);
      return NextResponse.json({ message: 'Deletion request cancelled. Tenant restored to ACTIVE.' });
    } else {
      await TenantDeletionService.requestDeletion(targetTenantId);
      return NextResponse.json({
        message: `Deletion scheduled. Tenant will be permanently deleted after 30 days.`,
      });
    }
  } catch (error: unknown) {
    Logger.error('Error in deletion-request route:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
