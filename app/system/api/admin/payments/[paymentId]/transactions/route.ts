// path: app/system/api/admin/payments/[paymentId]/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { CreateTransactionRequestSchema, GetTransactionsQuerySchema } from "@/modules/payment/payment.dto";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/admin/payments/[paymentId]/transactions
 * List transactions for a payment (system:admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

    const { paymentId } = await params;
    const { searchParams } = new URL(request.url);

    const parsed = GetTransactionsQuerySchema.safeParse({
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 0,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
      paymentId,
      provider: searchParams.get("provider") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const result = await PaymentService.getTransactions(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /system/api/admin/payments/[paymentId]/transactions
 * Create a transaction for a payment (system:admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

    const { paymentId } = await params;
    const body = await request.json();

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    const parsed = CreateTransactionRequestSchema.safeParse({ ...body, paymentId, ipAddress, userAgent });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const transaction = await PaymentService.createTransaction(parsed.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
