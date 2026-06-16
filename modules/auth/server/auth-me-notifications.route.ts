// path: app/tenant/[tenantId]/api/auth/me/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import NotificationInAppService from "@nb/notification_inapp/server/notification_inapp.service";
import Limiter from "@nb/limiter/server/limiter.service.next";

/**
 * GET /tenant/[tenantId]/api/auth/me/notifications
 * Inbox of the authenticated user, scoped to {tenantId}. Notifications
 * pushed against other tenants are invisible here.
 */
export async function GET(
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

    const notifications = await NotificationInAppService.getAll(tenantId, user.userId);
    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /tenant/[tenantId]/api/auth/me/notifications
 * Clear the entire inbox for this user/tenant pair.
 */
export async function DELETE(
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

    await NotificationInAppService.clearAll(tenantId, user.userId);
    return NextResponse.json({ message: "Inbox cleared" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
