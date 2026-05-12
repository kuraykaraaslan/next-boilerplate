// path: app/system/api/auth/me/notifications/[notificationId]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import NotificationInAppService from "@/modules/notification_inapp/notification_inapp.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * PUT /system/api/auth/me/notifications/[notificationId]/read
 * Mark a single notification as read for the current user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
    });

    const { notificationId } = await params;

    await NotificationInAppService.markAsRead(user.userId, notificationId);

    return NextResponse.json({ message: "Notification marked as read" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
