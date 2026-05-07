import Limiter from '@/libs/limiter';
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import UserSessionCrudService from "@/modules/user_session/user_session.crud.service";
import UserSessionMessages from "@/modules/user_session/user_session.messages";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
  const _rl = await Limiter.checkRateLimit(request, 'api');
  if (_rl) return _rl;

    const { user, userSession } = await UserSessionNextService.authenticateUserByRequest({ request });
    const { sessionId } = await params;

    const sessions = await UserSessionCrudService.getUserSessions(user.userId);
    const target = sessions.find((s) => s.userSessionId === sessionId);

    if (!target) {
      return NextResponse.json({ message: UserSessionMessages.SESSION_NOT_FOUND }, { status: 404 });
    }

    await UserSessionCrudService.deleteSession(sessionId);

    return NextResponse.json({
      message: "Session revoked.",
      isCurrentSession: userSession.userSessionId === sessionId,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "An error occurred" }, { status: 500 });
  }
}
