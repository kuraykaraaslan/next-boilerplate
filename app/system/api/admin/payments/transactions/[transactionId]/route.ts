// path: app/system/api/admin/payments/transactions/[transactionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules_next/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { UpdateTransactionRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/modules_next/limiter/limiter.service.next";

/**
 * GET /system/api/admin/payments/transactions/[transactionId]
 * Get a single transaction (system:admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { transactionId } = await params;
    const transaction = await PaymentService.getTransactionById(transactionId);
    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /system/api/admin/payments/transactions/[transactionId]
 * Update a transaction (system:admin)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    await UserSessionNextService.authenticateUserByRequest({ request, requiredUserRole: "ADMIN" });

    const { transactionId } = await params;
    const body = await request.json();
    const parsed = UpdateTransactionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const transaction = await PaymentService.updateTransaction(transactionId, parsed.data);
    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
