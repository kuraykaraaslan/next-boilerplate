// path: app/system/api/admin/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import UserSessionNextService from "@/modules/user_session/user_session.service.next";
import PaymentService from "@/modules/payment/payment.service";
import { CreatePaymentRequestSchema, GetPaymentsQuerySchema } from "@/modules/payment/payment.dto";
import Limiter from "@/libs/limiter";

/**
 * GET /system/api/admin/payments
 * List payments with filters (system:admin)
 */
export async function GET(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

    const { searchParams } = new URL(request.url);
    const parsed = GetPaymentsQuerySchema.safeParse({
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 0,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 10,
      userId: searchParams.get("userId") ?? undefined,
      tenantId: searchParams.get("tenantId") ?? undefined,
      provider: searchParams.get("provider") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      currency: searchParams.get("currency") ?? undefined,
      fromDate: searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : undefined,
      toDate: searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const result = await PaymentService.getAll(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /system/api/admin/payments
 * Create a payment (system:admin)
 */
export async function POST(request: NextRequest) {
  try {
    await Limiter.checkRateLimit(request);
    await UserSessionNextService.authenticateUserByRequest({ request, requiredScopes: ["system:admin"] });

    const body = await request.json();
    const parsed = CreatePaymentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const payment = await PaymentService.create(parsed.data);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
