import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@/modules/payment/payment.service";
import { UpdatePaymentRequestSchema } from "@/modules/payment/payment.dto";
import Limiter from "@/modules_next/limiter/limiter.service.next";

import TenantSessionNextService from '@/modules_next/tenant_session/tenant_session.service.next';
/**
 * GET /tenant/[tenantId]/api/payments/[paymentId]
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

    const payment = await PaymentService.getByIdWithTransactions(paymentId);
    return NextResponse.json({ payment }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /tenant/[tenantId]/api/payments/[paymentId]
 */
export async function PUT(
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
 * DELETE /tenant/[tenantId]/api/payments/[paymentId]
 */
export async function DELETE(
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

    await PaymentService.delete(paymentId);
    return NextResponse.json({ message: "Payment deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
