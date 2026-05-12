// path: app/system/api/auth/me/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import NotificationInAppService from "@/modules/notification_inapp/notification_inapp.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /system/api/auth/me/notifications
 * Get all notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const notifications = await NotificationInAppService.getAll(user.userId);

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /system/api/auth/me/notifications
 * Clear all notifications for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    await NotificationInAppService.clearAll(user.userId);

    return NextResponse.json({ message: "All notifications cleared" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
