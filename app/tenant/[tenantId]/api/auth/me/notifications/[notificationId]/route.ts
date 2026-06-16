// path: app/tenant/[tenantId]/api/auth/me/notifications/[notificationId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import NotificationInAppService from "@nb/notification_inapp/server/notification_inapp.service";
import Limiter from "@nb/limiter/server/limiter.service.next";

/**
 * PUT /tenant/[tenantId]/api/auth/me/notifications/[notificationId]
 * Mark a single notification as read.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; notificationId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, notificationId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    await NotificationInAppService.markAsRead(tenantId, user.userId, notificationId);
    return NextResponse.json({ message: "Notification marked as read" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/auth/me/notifications/[notificationId]
 * Remove a single notification from the inbox.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; notificationId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, notificationId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    await NotificationInAppService.deleteOne(tenantId, user.userId, notificationId);
    return NextResponse.json({ message: "Notification removed" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
