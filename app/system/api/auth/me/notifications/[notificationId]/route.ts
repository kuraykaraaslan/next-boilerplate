// path: app/system/api/auth/me/notifications/[notificationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import NotificationInAppService from "@/modules/notification_inapp/notification_inapp.service";
import Limiter from "@/libs/limiter";

/**
 * DELETE /system/api/auth/me/notifications/[notificationId]
 * Delete a single notification for the current user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const { notificationId } = await params;

    await NotificationInAppService.deleteOne(user.userId, notificationId);

    return NextResponse.json({ message: "Notification deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
