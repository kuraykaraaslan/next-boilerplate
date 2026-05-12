// path: app/system/api/admin/payments/provider-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { GetProviderStatusRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/libs/limiter";

/**
 * POST /system/api/admin/payments/provider-status
 * Get payment status from provider by token (system:admin)
 */
export async function POST(request: NextRequest) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const body = await request.json();
    const parsed = GetProviderStatusRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const status = await PaymentService.getProviderStatus(parsed.data);
    return NextResponse.json({ status }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
