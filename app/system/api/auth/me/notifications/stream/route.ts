// path: app/system/api/auth/me/notifications/stream/route.ts
import { NextRequest } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import NotificationInAppService from "@/modules/notification_inapp/notification_inapp.service";

export const dynamic = "force-dynamic";

/**
 * GET /system/api/auth/me/notifications/stream
 * SSE stream for real-time notifications for the current user
 */
export async function GET(request: NextRequest) {
  let user: { userId: string };

  try {
    const auth = await UserSessionNextService.authenticateUserByRequest({
      request,
    });
    user = auth.user;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId } = user;

  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof NotificationInAppService.createSubscriber> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      subscriber = NotificationInAppService.createSubscriber();

      const channel = `notifications:${userId}`;

      subscriber.subscribe(channel, (err) => {
        if (err && !closed) {
          controller.error(err);
        }
      });

      subscriber.on("message", (_channel: string, message: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          closed = true;
        }
      });

      request.signal.addEventListener("abort", () => {
        closed = true;
        subscriber?.unsubscribe(channel);
        subscriber?.disconnect();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      closed = true;
      subscriber?.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
