// path: app/system/api/admin/notifications/sms/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import SMSService from "@/modules/notification_sms/notification_sms.service";
import Limiter from "@/libs/limiter";
import { z } from "zod";

const SendSMSDTO = z.object({
  to: z.string().min(5),
  body: z.string().min(1).max(1600),
  provider: z.enum(["twilio", "netgsm", "clickatell", "nexmo"]).optional(),
  direct: z.boolean().optional().default(false),
});

/**
 * POST /system/api/admin/notifications/sms/send
 * Send an SMS message (system:admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    const body = await request.json();
    const parsed = SendSMSDTO.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const { to, body: message, provider, direct } = parsed.data;

    if (direct) {
      await SMSService.sendShortMessageDirect({ to, body: message, provider });
    } else {
      await SMSService.sendShortMessage({ to, body: message, provider });
    }

    return NextResponse.json({ message: "SMS queued for delivery" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * GET /system/api/admin/notifications/sms/send
 * Get SMS provider info and region mapping (system:admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({
      request,
      requiredUserRole: "ADMIN",
    });

    return NextResponse.json({
      providers: SMSService.listProviders(),
      regionProviderMap: SMSService.getRegionProviderMap(),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
