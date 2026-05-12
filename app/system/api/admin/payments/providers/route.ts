// path: app/system/api/admin/payments/providers/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /system/api/admin/payments/providers
 * List available payment providers and default (system:admin)
 */
export async function GET(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    return NextResponse.json({
      providers: PaymentService.getAvailableProviders(),
      default: PaymentService.getDefaultProvider(),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
