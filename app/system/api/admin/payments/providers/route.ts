// path: app/system/api/admin/payments/providers/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/admin/payments/providers
 * List available payment providers and default (system:admin)
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

    return NextResponse.json({
      providers: PaymentService.getAvailableProviders(),
      default: PaymentService.getDefaultProvider(),
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
