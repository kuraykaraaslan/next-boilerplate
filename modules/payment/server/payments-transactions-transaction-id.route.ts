import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@nb/payment/server/payment.service";
import { UpdateTransactionRequestSchema } from "@nb/payment/server/payment.dto";
import Limiter from "@nb/limiter/server/limiter.service.next";

import TenantSessionNextService from '@nb/tenant_session/server/tenant_session.service.next';
/**
 * GET /tenant/[tenantId]/api/payments/transactions/[transactionId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; transactionId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, transactionId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

    const transaction = await PaymentService.getTransactionById(transactionId);
    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /tenant/[tenantId]/api/payments/transactions/[transactionId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; transactionId: string }> }
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId, transactionId } = await params

    try {

      await TenantSessionNextService.authenticateTenantByRequest({

        request, tenantId, requiredTenantRole: 'ADMIN',

      });

    } catch (err: any) {

      return NextResponse.json({ success: false, message: err.message }, { status: 403 });

    }

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
