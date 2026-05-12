// path: app/system/api/admin/payments/[paymentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { UpdatePaymentRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /system/api/admin/payments/[paymentId]
 * Get payment with transactions (system:admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { paymentId } = await params;
    const payment = await PaymentService.getByIdWithTransactions(paymentId);
    return NextResponse.json({ payment }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /system/api/admin/payments/[paymentId]
 * Update a payment (system:admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { paymentId } = await params;
    const body = await request.json();
    const parsed = UpdatePaymentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const payment = await PaymentService.update(paymentId, parsed.data);
    return NextResponse.json({ payment }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /system/api/admin/payments/[paymentId]
 * Soft-delete a payment (system:admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { paymentId } = await params;
    await PaymentService.delete(paymentId);
    return NextResponse.json({ message: "Payment deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
