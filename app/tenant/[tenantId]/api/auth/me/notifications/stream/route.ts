// path: app/tenant/[tenantId]/api/auth/me/notifications/stream/route.ts
import { NextRequest } from "next/server";
import TenantSessionNextService from "@nb/tenant_session/server/tenant_session.service.next";
import NotificationInAppService from "@nb/notification_inapp/server/notification_inapp.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /tenant/[tenantId]/api/auth/me/notifications/stream
 * Server-Sent Events stream of new notifications for the authenticated user,
 * subscribed only to the tenant-scoped pub/sub channel — no cross-tenant
 * inbox bleed possible.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  const { user } = await TenantSessionNextService.authenticateTenantByRequest({
    request,
    tenantId,
  });

  const channel = NotificationInAppService.channel(tenantId, user.userId);
  const subscriber = NotificationInAppService.createSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      await subscriber.subscribe(channel);
      subscriber.on("message", (_chan, msg) => send(msg));

      // keep-alive ping
      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 25_000);

      const close = () => {
        clearInterval(ping);
        subscriber.quit().catch(() => {});
        try { controller.close(); } catch { /* ignore */ }
      };

      request.signal.addEventListener("abort", close);
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
