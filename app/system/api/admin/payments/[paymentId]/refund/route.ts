// path: app/system/api/admin/payments/[paymentId]/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { RefundPaymentRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/libs/limiter";

/**
 * POST /system/api/admin/payments/[paymentId]/refund
 * Refund a payment (system:admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { paymentId } = await params;
    const body = await request.json();

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const parsed = RefundPaymentRequestSchema.safeParse({ ...body, paymentId, ipAddress, userAgent });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const transaction = await PaymentService.refund(parsed.data);
    return NextResponse.json({ message: "Refund processed", transaction }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
