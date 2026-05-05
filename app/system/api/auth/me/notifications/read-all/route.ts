// path: app/system/api/auth/me/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import NotificationInAppService from "@/modules/notification_inapp/notification_inapp.service";
import Limiter from "@/libs/limiter";

/**
 * PUT /system/api/auth/me/notifications/read-all
 * Mark all notifications as read for the current user
 */
export async function PUT(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    await NotificationInAppService.markAllAsRead(user.userId);

    return NextResponse.json({ message: "All notifications marked as read" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
