// path: app/tenant/[tenantId]/api/auth/me/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Limiter from '@nb/limiter/server/limiter.service.next';
import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
import UserSessionCrudService from '@nb/user_session/server/user_session.crud.service';
import UserSessionMessages from '@nb/user_session/server/user_session.messages';

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
