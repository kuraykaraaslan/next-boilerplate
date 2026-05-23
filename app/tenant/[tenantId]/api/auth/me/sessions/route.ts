// path: app/tenant/[tenantId]/api/auth/me/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import UserSessionCrudService from '@/modules/user_session/user_session.crud.service';

/**
 * GET /tenant/[tenantId]/api/auth/me/sessions
 * Tenant-scoped /api/auth/me endpoint.
 * Returns all of the current user's active sessions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const sessions = await UserSessionCrudService.getUserSessions(user.userId);
    return NextResponse.json({ sessions });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'An error occurred' }, { status: 500 });
  }
}
