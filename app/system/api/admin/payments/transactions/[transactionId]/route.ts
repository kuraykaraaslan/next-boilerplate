// path: app/system/api/admin/payments/transactions/[transactionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { UpdateTransactionRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/admin/payments/transactions/[transactionId]
 * Get a single transaction (system:admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

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
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

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
