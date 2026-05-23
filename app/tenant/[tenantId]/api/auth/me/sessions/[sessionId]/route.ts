// path: app/tenant/[tenantId]/api/auth/me/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@/modules_next/limiter/limiter.service.next';
import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
import UserSessionCrudService from '@/modules/user_session/user_session.crud.service';
import UserSessionMessages from '@/modules/user_session/user_session.messages';

/**
 * DELETE /tenant/[tenantId]/api/auth/me/sessions/[sessionId]
 * Tenant-scoped /api/auth/me endpoint.
 * Revokes one of the current user's sessions.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; sessionId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request, 'api');
    if (_rl) return _rl;
    const { tenantId, sessionId } = await params;

    const { user, userSession } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    const sessions = await UserSessionCrudService.getUserSessions(user.userId);
    const target = sessions.find((s) => s.userSessionId === sessionId);

    if (!target) {
      return NextResponse.json({ message: UserSessionMessages.SESSION_NOT_FOUND }, { status: 404 });
    }

    await UserSessionCrudService.deleteSession(sessionId);

    return NextResponse.json({
      message: 'Session revoked.',
      isCurrentSession: userSession.userSessionId === sessionId,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'An error occurred' }, { status: 500 });
  }
}
