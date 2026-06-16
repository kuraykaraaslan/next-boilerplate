import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@nb/payment/server/payment.service";
import { RefundPaymentRequestSchema } from "@nb/payment/server/payment.dto";
import Limiter from "@nb/limiter/server/limiter.service.next";
import { withIdempotency } from '@nb/redis_idempotency/server/withIdempotency';

import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
/**
 * POST /tenant/[tenantId]/api/payments/[paymentId]/refund
 * Idempotent via the `Idempotency-Key` header (guards a double refund).
 */
export const POST = withIdempotency(async function POST(
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

    const parsed = RefundPaymentRequestSchema.safeParse({ ...body, paymentId, ipAddress, userAgent });

    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }

    const transaction = await PaymentService.refund(parsed.data);
    return NextResponse.json({ message: "Refund processed", transaction }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
})
