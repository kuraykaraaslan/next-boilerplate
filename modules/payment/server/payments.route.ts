import { NextRequest, NextResponse } from "next/server";
import PaymentService from "@kuraykaraaslan/payment/server/payment.service";
import { CreatePaymentRequestSchema, GetPaymentsQuerySchema } from "@kuraykaraaslan/payment/server/payment.dto";
import Limiter from "@kuraykaraaslan/limiter/server/limiter.service.next";

import TenantSessionNextService from '@kuraykaraaslan/tenant_session/server/tenant_session.service.next';
/**
 * GET /tenant/[tenantId]/api/payments
 * Root-tenant admins only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
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
 * POST /tenant/[tenantId]/api/payments
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  try {
    const _rl = await Limiter.checkRateLimit(request);
    if (_rl) return _rl;
    const { tenantId } = await params;
    try {
      await TenantSessionNextService.authenticateTenantByRequest({
        request, tenantId, requiredTenantRole: 'ADMIN',
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 403 });
    }
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
