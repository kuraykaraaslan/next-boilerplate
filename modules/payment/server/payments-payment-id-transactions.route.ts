import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@kuraykaraaslan/payment/server/payment.service";
import { CreateTransactionRequestSchema, GetTransactionsQuerySchema } from "@kuraykaraaslan/payment/server/payment.dto";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
/**
 * GET /tenant/[tenantId]/api/payments/[paymentId]/transactions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, paymentId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

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
 * POST /tenant/[tenantId]/api/payments/[paymentId]/transactions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; paymentId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, paymentId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

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
