import { NextRequest, NextResponse } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import NotificationPushService from "@nb/notification_push/server/notification_push.service";
import Limiter from "@nb/limiter/server/limiter.service.next";
import { z } from "zod";

const SubscribeDTO = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /tenant/[tenantId]/api/notifications/push/subscribe
 * Register a push subscription for the current user, scoped to this tenant.
 * The same browser endpoint may also be subscribed to other tenants the
 * user belongs to — the composite (tenantId, endpoint) unique key allows it.
 */
export async function POST(
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

    const body = await request.json();
    const parsed = SubscribeDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    await NotificationPushService.subscribe(tenantId, user.userId, parsed.data);

    return NextResponse.json({ message: "Push subscription saved" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /tenant/[tenantId]/api/notifications/push/subscribe
 * Optional ?endpoint=... to remove a single subscription. Without it, all
 * subscriptions for the user in this tenant are removed.
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

    const endpoint = request.nextUrl.searchParams.get('endpoint');
    if (endpoint) {
      await NotificationPushService.unsubscribeByEndpoint(tenantId, endpoint);
    } else {
      await NotificationPushService.unsubscribe(tenantId, user.userId);
    }

    return NextResponse.json({ message: "Push subscription removed" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
