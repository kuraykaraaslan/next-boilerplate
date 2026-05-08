// path: app/system/api/tenants/[tenantId]/deletion-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import UserSessionNextService from '@/modules/user_session/user_session.service.next';
import TenantDeletionService from '@/modules/tenant/tenant.deletion.service';
import Limiter from '@/libs/limiter';
import Logger from '@/libs/logger';

/**
 * POST /system/api/tenants/[tenantId]/deletion-request
 * Request or cancel staged deletion of a tenant (requires global ADMIN role).
 * Body: { cancel?: boolean }
 *   - cancel=false (default): schedules deletion after 30-day grace period
 *   - cancel=true: cancels a pending deletion and restores tenant to ACTIVE
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;

    const { tenantId } = await params;

    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: 'ADMIN',
    });

    const body = await request.json().catch(() => ({}));
    const cancel = body.cancel === true;

    if (cancel) {
      await TenantDeletionService.cancelDeletion(tenantId);
      return NextResponse.json({ message: 'Deletion request cancelled. Tenant restored to ACTIVE.' });
    } else {
      await TenantDeletionService.requestDeletion(tenantId);
      return NextResponse.json({
        message: `Deletion scheduled. Tenant will be permanently deleted after 30 days.`,
      });
    }
  } catch (error: unknown) {
    Logger.error('Error in deletion-request route:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
  }
}
