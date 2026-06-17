// path: app/tenant/[tenantId]/api/auth/me/notifications/read-all/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@kuraykaraaslan/tenant_session/server/tenant_session.service.next";
import NotificationInAppService from "@kuraykaraaslan/notification_inapp/server/notification_inapp.service";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

/**
 * PUT /tenant/[tenantId]/api/auth/me/notifications/read-all
 * Mark every notification in the user's tenant-scoped inbox as read.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;

    const { user } = await TenantSessionNextService.authenticateTenantByRequest({
      request,
      tenantId,
    });

    await NotificationInAppService.markAllAsRead(tenantId, user.userId);
    return NextResponse.json({ message: "All notifications marked as read" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
