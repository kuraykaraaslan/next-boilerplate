import { NextRequest, NextResponse } from "next/server";
import SMSService from "@/modules/notification_sms/notification_sms.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";
import { z } from "zod";
import { authenticateAdminRequest } from "@/modules_next/auth/auth.admin-guard.next";

const SendSMSDTO = z.object({
  to: z.string().min(5),
  body: z.string().min(1).max(1600),
  provider: z.enum(["twilio", "netgsm", "clickatell", "nexmo"]).optional(),
  direct: z.boolean().optional().default(false),
});

/**
 * POST /tenant/[tenantId]/api/notifications/sms/send
 *
 * Only tenant admins may send SMS on behalf of their tenant. The provider
 * resolves credentials from the tenant's settings table (with env fallback).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = SendSMSDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { to, body: message, provider, direct } = parsed.data;
    // Pass the client's Idempotency-Key down to the queue/worker so a retried
    // request (or a worker retry) doesn't deliver the same SMS twice.
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

    if (direct) {
      await SMSService.sendShortMessageDirect(tenantId, { to, body: message, provider, idempotencyKey });
    } else {
      await SMSService.sendShortMessage(tenantId, { to, body: message, provider, idempotencyKey });
    }

    return NextResponse.json({ message: "SMS queued for delivery" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * GET /tenant/[tenantId]/api/notifications/sms/send
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const auth = await authenticateAdminRequest(request);
    if (!auth.ok) return auth.response;

    return NextResponse.json({
      providers: await SMSService.listProviders(tenantId),
      regionProviderMap: SMSService.getRegionProviderMap(),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
