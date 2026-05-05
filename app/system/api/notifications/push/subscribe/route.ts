// path: app/system/api/notifications/push/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import NotificationPushService from "@/modules/notification_push/notification_push.service";
import Limiter from "@/libs/limiter";
import { z } from "zod";

const SubscribeDTO = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /system/api/notifications/push/subscribe
 * Register a push subscription for the current user
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    const body = await request.json();
    const parsed = SubscribeDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    await NotificationPushService.subscribe(user.userId, parsed.data);

    return NextResponse.json({ message: "Push subscription saved" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /system/api/notifications/push/subscribe
 * Remove all push subscriptions for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { user } = await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredScopes: ["system:read"],
    });

    await NotificationPushService.unsubscribe(user.userId);

    return NextResponse.json({ message: "Push subscription removed" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
