// path: app/system/api/auth/me/notifications/unread-count/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import NotificationInAppService from "@/modules/notification_inapp/notification_inapp.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/auth/me/notifications/unread-count
 * Get unread notification count for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const count = await NotificationInAppService.unreadCount(user.userId);

    return NextResponse.json({ count }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
